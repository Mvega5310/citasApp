/**
 * Datos de prueba para test:tenants, con la misma forma en Firestore (emulador)
 * y en Postgres (base citas_test). En Postgres se imita lo que hará el script
 * de copia: lo "antiguo" (colección raíz, configuración global) pertenece a la
 * barbería por defecto.
 */
import { pathToFileURL } from 'node:url';

export type TenantSeed = {
  name: string;
  active: boolean;
  services?: Record<string, unknown>[];
  workingHours?: Record<string, { open: string; close: string; closed: boolean }>;
};
export type AppointmentSeed = Record<string, unknown> & {
  status: string;
  date?: string;
  time?: string;
  reminderSent?: boolean;
  createdAt?: string;
};

export interface Fixtures {
  reset(): Promise<void>;
  tenant(slug: string, data: TenantSeed): Promise<void>;
  /** La barbería existe pero sin ficha ni catálogo propio (como la barbería por defecto en producción). */
  withoutProfile(slug: string): Promise<void>;
  /** slug '' = colección antigua (sin barbería). */
  appointment(slug: string, id: string, data: AppointmentSeed): Promise<void>;
  readAppointment(slug: string, id: string): Promise<{ status?: string; reminderSent?: boolean } | null>;
  legacySettings(data: Record<string, unknown>): Promise<void>;
  readSettings(slug: string): Promise<Record<string, unknown> | undefined>;
  readLegacySettings(): Promise<Record<string, unknown> | undefined>;
  admin(id: string, data: { name: string; role: 'admin' | 'viewer'; tenantSlug?: string }): Promise<void>;
  readAdmin(id: string): Promise<{ role?: string } | null>;
  close(): Promise<void>;
}

const imp = (root: string, rel: string) => import(pathToFileURL(`${root}/${rel}`).href);

export async function firestoreFixtures(root: string): Promise<Fixtures> {
  const { adminDb } = await imp(root, 'lib/server/firebaseAdmin.ts');
  const db = adminDb();
  const apptCol = (slug: string) =>
    slug ? db.collection('tenants').doc(slug).collection('appointments') : db.collection('appointments');
  return {
    async reset() {
      await fetch(
        `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/turnos-de-belleza/databases/(default)/documents`,
        { method: 'DELETE' }
      );
    },
    async tenant(slug, data) {
      await db.collection('tenants').doc(slug).set(data);
    },
    async withoutProfile(slug) {
      await db.collection('tenants').doc(slug).delete();
    },
    async appointment(slug, id, data) {
      await apptCol(slug).doc(id).set(data);
    },
    async readAppointment(slug, id) {
      const snap = await apptCol(slug).doc(id).get();
      return snap.exists ? (snap.data() as { status?: string; reminderSent?: boolean }) : null;
    },
    async legacySettings(data) {
      await db.collection('settings').doc('salon').set(data);
    },
    async readSettings(slug) {
      return (await db.collection('tenants').doc(slug).collection('settings').doc('salon').get()).data();
    },
    async readLegacySettings() {
      return (await db.collection('settings').doc('salon').get()).data();
    },
    async admin(id, data) {
      await db.collection('admins').doc(id).set({ ...data, createdAt: new Date() });
    },
    async readAdmin(id) {
      const snap = await db.collection('admins').doc(id).get();
      return snap.exists ? (snap.data() as { role?: string }) : null;
    },
    async close() {},
  };
}

export async function postgresFixtures(root: string): Promise<Fixtures> {
  const { query, pg } = await imp(root, 'lib/server/pg.ts');
  const { DEFAULTS } = await imp(root, 'lib/server/settings.ts');
  const DEFAULT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'demo';
  const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  let legacy: Record<string, unknown> | undefined;

  const tenantId = async (slug: string) => {
    const s = slug || DEFAULT;
    const r = await query(
      `INSERT INTO tenants (slug) VALUES ($1) ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`,
      [s]
    );
    return r.rows[0].id as string;
  };

  return {
    async reset() {
      await query(
        `TRUNCATE password_tokens, admins, blocked_slots, appointments, working_hours, services,
                  tenant_settings, tenants RESTART IDENTITY CASCADE`
      );
      legacy = undefined;
    },
    async tenant(slug, data) {
      const id = await tenantId(slug);
      await query(`UPDATE tenants SET name = $2, status = $3 WHERE id = $1`, [id, data.name, data.active ? 'active' : 'suspended']);
      if (data.services) {
        for (const [i, s] of data.services.entries()) {
          try {
            await query(
              `INSERT INTO services (tenant_id, id, name, description, duration_min, price, active, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [id, s.id, s.name, s.description ?? '', s.duration, s.price, s.active !== false, i]
            );
          } catch {
            // Un servicio mal formado no puede existir en Postgres (lo impiden las reglas de la tabla)
          }
        }
        await query('UPDATE tenants SET catalog_updated_at = now() WHERE id = $1', [id]);
      }
      if (data.workingHours) {
        for (const [weekday, key] of DAY_KEYS.entries()) {
          const d = data.workingHours[key];
          await query(
            'INSERT INTO working_hours (tenant_id, weekday, open_time, close_time, closed) VALUES ($1, $2, $3, $4, $5)',
            [id, weekday, d.open, d.close, d.closed]
          );
        }
      }
    },
    async withoutProfile(slug) {
      const id = await tenantId(slug);
      await query(`UPDATE tenants SET name = '', status = 'active', catalog_updated_at = NULL WHERE id = $1`, [id]);
      await query('DELETE FROM services WHERE tenant_id = $1', [id]);
      await query('DELETE FROM working_hours WHERE tenant_id = $1', [id]);
    },
    async appointment(slug, id, d) {
      const tid = await tenantId(slug);
      await query(
        `INSERT INTO appointments (id, tenant_id, service_id, service_name, client_name, client_email,
           client_whatsapp, date, time, status, reminder_sent_at, created_at)
         VALUES ($1, $2, 's', $3, $4, $5, '3000000000', $6, $7, $8, $9, coalesce($10::timestamptz, now()))`,
        [id, tid, d.serviceName ?? 'S', d.clientName ?? 'X', d.clientEmail ?? 'x@test.co', d.date ?? '2027-01-01',
          d.time ?? '09:00', d.status, d.reminderSent ? new Date() : null, d.createdAt ?? null]
      );
    },
    async readAppointment(slug, id) {
      const r = await query(
        `SELECT a.status, a.reminder_sent_at IS NOT NULL AS reminded FROM appointments a
         JOIN tenants t ON t.id = a.tenant_id WHERE t.slug = $1 AND a.id = $2`,
        [slug || DEFAULT, id]
      );
      return r.rows[0] ? { status: r.rows[0].status, reminderSent: r.rows[0].reminded } : null;
    },
    async legacySettings(data) {
      // La copia pasa la configuración global anterior a la barbería por defecto
      legacy = { ...data };
      const s = { ...DEFAULTS, ...data };
      const id = await tenantId(DEFAULT);
      await query(
        `INSERT INTO tenant_settings (tenant_id, salon_name, phone, address, city, contact_email, instagram,
           facebook, whatsapp, notify_client, notify_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, s.salonName, s.phone, s.address, s.city, s.contactEmail, s.instagram, s.facebook, s.whatsapp,
          s.notifyClient, s.notifyAdmin]
      );
    },
    async readSettings(slug) {
      const r = await query(
        `SELECT s.salon_name AS "salonName", s.phone FROM tenant_settings s JOIN tenants t ON t.id = s.tenant_id
         WHERE t.slug = $1`,
        [slug]
      );
      return r.rows[0];
    },
    async readLegacySettings() {
      return legacy;
    },
    async admin(id, data) {
      const tid = await tenantId(data.tenantSlug ?? DEFAULT);
      await query(`INSERT INTO admins (id, tenant_id, email, name, role) VALUES ($1, $2, $3, $4, $5)`, [
        id,
        tid,
        `${id}@test.co`,
        data.name,
        data.role,
      ]);
    },
    async readAdmin(id) {
      const r = await query('SELECT role FROM admins WHERE id = $1', [id]);
      return r.rows[0] ?? null;
    },
    async close() {
      await pg().end();
    },
  };
}
