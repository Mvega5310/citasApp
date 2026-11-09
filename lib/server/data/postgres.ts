import type { PoolClient } from 'pg';
import type { Service, TenantConfig } from '@/types';
import { query, withTransaction } from '../pg';
import { DEFAULT_TENANT_SLUG } from '../tenantDefaults';
import type { EditableCatalog } from '../catalog';
import type { SalonSettings } from '../settings';
import {
  ACTIVE_STATUSES,
  SlotTakenError,
  type AdminRecord,
  type AppointmentPatch,
  type AppointmentRecord,
  type DataStore,
  type NewAppointment,
} from './types';

type Q = Pick<PoolClient, 'query'>;
const db: Q = { query: ((text: string, params?: unknown[]) => query(text, params)) as PoolClient['query'] };

const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

// Slug vacío (enlaces anteriores al multi-tenant) = barbería por defecto
const norm = (slug: string) => slug || DEFAULT_TENANT_SLUG;

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : (v as string | null) ?? null);

/**
 * id interno de la barbería. La barbería por defecto se crea al primer uso
 * (igual que en Firestore, funciona sin ficha previa); las demás deben existir.
 */
async function tenantId(q: Q, slug: string): Promise<string> {
  const s = norm(slug);
  const found = await q.query<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [s]);
  if (found.rows[0]) return found.rows[0].id;
  if (s !== DEFAULT_TENANT_SLUG) throw new Error(`Barbería inexistente: ${s}`);
  const created = await q.query<{ id: string }>(
    `INSERT INTO tenants (slug) VALUES ($1)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [s]
  );
  return created.rows[0].id;
}

// ── Citas ────────────────────────────────────────────────────────────────────

const APPOINTMENT_COLUMNS = `
  a.id, t.slug AS tenant_slug, a.service_id, a.service_name, a.client_name, a.client_email,
  a.client_whatsapp, a.date, a.time, a.status, a.group_id, a.habeas_data_accepted,
  a.notifications_accepted, a.reminder_sent_at, a.cancelled_at, a.cancelled_by, a.late_cancel,
  a.source, a.created_at, a.updated_at`;

type AppointmentRow = Record<string, unknown>;

function toAppointment(r: AppointmentRow): AppointmentRecord {
  return {
    id: r.id as string,
    tenantSlug: r.tenant_slug as string,
    serviceId: r.service_id as string,
    serviceName: r.service_name as string,
    clientName: r.client_name as string,
    clientEmail: r.client_email as string,
    clientWhatsApp: r.client_whatsapp as string,
    date: r.date as string,
    time: r.time as string,
    status: r.status as AppointmentRecord['status'],
    groupId: (r.group_id as string | null) ?? null,
    habeasDataAccepted: r.habeas_data_accepted as boolean,
    notificationsAccepted: r.notifications_accepted as boolean,
    reminderSent: r.reminder_sent_at != null,
    reminderSentAt: iso(r.reminder_sent_at),
    cancelledAt: iso(r.cancelled_at),
    cancelledBy: (r.cancelled_by as string | null) ?? null,
    lateCancel: (r.late_cancel as boolean | null) ?? null,
    source: (r.source as string | null) ?? null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const isSlotConflict = (e: unknown) =>
  (e as { code?: string; constraint?: string })?.code === '23505' &&
  (e as { constraint?: string }).constraint === 'appointments_one_active_per_slot';

async function selectAppointments(where: string, params: unknown[], order = 'a.created_at DESC') {
  const res = await query(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments a JOIN tenants t ON t.id = a.tenant_id
     WHERE ${where} ORDER BY ${order}`,
    params
  );
  return res.rows.map(toAppointment);
}

// ── Administradores ──────────────────────────────────────────────────────────

function toAdmin(r: Record<string, unknown>): AdminRecord {
  return {
    id: r.id as string,
    tenantSlug: r.tenant_slug as string,
    email: r.email as string,
    name: r.name as string,
    role: r.role === 'admin' ? 'admin' : 'viewer',
    invited: r.invited as boolean,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: iso(r.created_at),
    passwordChangedAt: iso(r.password_changed_at),
  };
}

const ADMIN_SELECT = `SELECT a.*, t.slug AS tenant_slug FROM admins a JOIN tenants t ON t.id = a.tenant_id`;

// ── Implementación ───────────────────────────────────────────────────────────

export const postgresStore: DataStore = {
  backend: 'postgres',

  async lookupTenant(slug) {
    const res = await query(
      `SELECT t.*,
         (SELECT coalesce(json_agg(s ORDER BY s.sort_order, s.id), '[]'::json) FROM services s WHERE s.tenant_id = t.id) AS services,
         (SELECT coalesce(json_agg(w ORDER BY w.weekday), '[]'::json) FROM working_hours w WHERE w.tenant_id = t.id) AS hours
       FROM tenants t WHERE t.slug = $1`,
      [slug]
    );
    const t = res.rows[0];
    if (!t) return { found: false };

    const hours = t.hours as { weekday: number; open_time: string; close_time: string; closed: boolean }[];
    const config: Record<string, unknown> = {
      ...(t.profile ?? {}),
      slug,
      name: t.name,
      active: t.status === 'active',
    };
    // Sin catálogo guardado: se deja sin definir para usar el catálogo por defecto
    if (t.catalog_updated_at) {
      config.services = (t.services as Record<string, unknown>[]).map(
        (s) =>
          ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration_min,
            price: s.price,
            icon: '',
            active: s.active,
          }) as Service & { active: boolean }
      );
    }
    if (hours.length) {
      config.workingHours = Object.fromEntries(
        hours.map((h) => [
          DAY_KEYS[h.weekday],
          { open: h.open_time.slice(0, 5), close: h.close_time.slice(0, 5), closed: h.closed },
        ])
      );
    }
    return { found: true, config: config as unknown as TenantConfig };
  },

  async saveCatalog(slug, catalog: EditableCatalog, updatedBy) {
    await withTransaction(async (c) => {
      const tid = await tenantId(c, slug);
      await c.query('DELETE FROM services WHERE tenant_id = $1', [tid]);
      for (const [i, s] of catalog.services.entries()) {
        await c.query(
          `INSERT INTO services (tenant_id, id, name, description, duration_min, price, active, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tid, s.id, s.name, s.description, s.duration, s.price, s.active, i]
        );
      }
      await c.query('DELETE FROM working_hours WHERE tenant_id = $1', [tid]);
      for (const [weekday, key] of DAY_KEYS.entries()) {
        const d = catalog.workingHours[key];
        await c.query(
          'INSERT INTO working_hours (tenant_id, weekday, open_time, close_time, closed) VALUES ($1, $2, $3, $4, $5)',
          [tid, weekday, d.open, d.close, d.closed]
        );
      }
      await c.query(
        'UPDATE tenants SET catalog_updated_at = now(), catalog_updated_by = $2, updated_at = now() WHERE id = $1',
        [tid, updatedBy]
      );
    });
  },

  async readSettings(slug) {
    const res = await query(
      `SELECT s.* FROM tenant_settings s JOIN tenants t ON t.id = s.tenant_id WHERE t.slug = $1`,
      [norm(slug)]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      salonName: r.salon_name,
      phone: r.phone,
      address: r.address,
      city: r.city,
      contactEmail: r.contact_email,
      instagram: r.instagram,
      facebook: r.facebook,
      whatsapp: r.whatsapp,
      notifyClient: r.notify_client,
      notifyAdmin: r.notify_admin,
    } satisfies SalonSettings;
  },

  async writeSettings(slug, s) {
    const tid = await tenantId(db, slug);
    await query(
      `INSERT INTO tenant_settings (tenant_id, salon_name, phone, address, city, contact_email,
         instagram, facebook, whatsapp, notify_client, notify_admin, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       ON CONFLICT (tenant_id) DO UPDATE SET
         salon_name = EXCLUDED.salon_name, phone = EXCLUDED.phone, address = EXCLUDED.address,
         city = EXCLUDED.city, contact_email = EXCLUDED.contact_email, instagram = EXCLUDED.instagram,
         facebook = EXCLUDED.facebook, whatsapp = EXCLUDED.whatsapp, notify_client = EXCLUDED.notify_client,
         notify_admin = EXCLUDED.notify_admin, updated_at = now()`,
      [tid, s.salonName, s.phone, s.address, s.city, s.contactEmail, s.instagram, s.facebook, s.whatsapp,
        s.notifyClient, s.notifyAdmin]
    );
  },

  listAppointments: (slug) => selectAppointments('t.slug = $1', [norm(slug)]),

  appointmentsOnDate: (slug, date) =>
    selectAppointments('t.slug = $1 AND a.date = $2', [norm(slug), date], 'a.time, a.created_at'),

  appointmentsInGroup: (slug, groupId) =>
    selectAppointments('t.slug = $1 AND a.group_id = $2', [norm(slug), groupId], 'a.date, a.time'),

  async getAppointment(slug, id) {
    const rows = await selectAppointments('t.slug = $1 AND a.id = $2', [norm(slug), id]);
    return rows[0] ?? null;
  },

  async createAppointments(slug, items: NewAppointment[]) {
    try {
      return await withTransaction(async (c) => {
        const tid = await tenantId(c, slug);
        const ids: string[] = [];
        for (const it of items) {
          const res = await c.query<{ id: string }>(
            `INSERT INTO appointments (tenant_id, service_id, service_name, client_name, client_email,
               client_whatsapp, date, time, status, group_id, habeas_data_accepted, notifications_accepted, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, 'postgres')
             RETURNING id`,
            [tid, it.serviceId, it.serviceName, it.clientName, it.clientEmail, it.clientWhatsApp,
              it.date, it.time, it.groupId ?? null, it.habeasDataAccepted, it.notificationsAccepted]
          );
          ids.push(res.rows[0].id);
        }
        return ids;
      });
    } catch (e) {
      if (isSlotConflict(e)) throw new SlotTakenError();
      throw e;
    }
  },

  async updateAppointment(slug, id, patch: AppointmentPatch) {
    const columns: Record<keyof AppointmentPatch, string> = {
      status: 'status',
      cancelledAt: 'cancelled_at',
      cancelledBy: 'cancelled_by',
      lateCancel: 'late_cancel',
      reminderSentAt: 'reminder_sent_at',
    };
    const sets: string[] = ['updated_at = now()'];
    const params: unknown[] = [norm(slug), id];
    for (const [key, value] of Object.entries(patch) as [keyof AppointmentPatch, unknown][]) {
      if (value === undefined || !(key in columns)) continue;
      params.push(value);
      sets.push(`${columns[key]} = $${params.length}`);
    }
    try {
      const res = await query(
        `UPDATE appointments a SET ${sets.join(', ')}
         FROM tenants t WHERE t.id = a.tenant_id AND t.slug = $1 AND a.id = $2`,
        params
      );
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      if (isSlotConflict(e)) throw new SlotTakenError();
      throw e;
    }
  },

  async deleteAppointment(slug, id) {
    const res = await query(
      `DELETE FROM appointments a USING tenants t WHERE t.id = a.tenant_id AND t.slug = $1 AND a.id = $2`,
      [norm(slug), id]
    );
    return (res.rowCount ?? 0) > 0;
  },

  reminderCandidates: (dates) =>
    // A propósito sin filtro de barbería: el recordatorio recorre todas
    selectAppointments(
      'a.date = ANY($1::date[]) AND a.status = ANY($2::text[]) AND a.reminder_sent_at IS NULL',
      [dates, ACTIVE_STATUSES],
      'a.date, a.time'
    ),

  async blockedSlots(slug, date) {
    const res = await query<{ time: string }>(
      `SELECT b.time FROM blocked_slots b JOIN tenants t ON t.id = b.tenant_id
       WHERE t.slug = $1 AND b.date = $2 ORDER BY b.time`,
      [norm(slug), date]
    );
    return res.rows.map((r) => r.time);
  },

  async updateBlockedSlots(slug, date, slots, action) {
    return withTransaction(async (c) => {
      const tid = await tenantId(c, slug);
      if (action === 'block') {
        await c.query(
          `INSERT INTO blocked_slots (tenant_id, date, time)
           SELECT $1, $2, unnest($3::time[]) ON CONFLICT DO NOTHING`,
          [tid, date, slots]
        );
      } else {
        await c.query('DELETE FROM blocked_slots WHERE tenant_id = $1 AND date = $2 AND time = ANY($3::time[])', [
          tid,
          date,
          slots,
        ]);
      }
      const res = await c.query<{ time: string }>(
        'SELECT time FROM blocked_slots WHERE tenant_id = $1 AND date = $2 ORDER BY time',
        [tid, date]
      );
      return res.rows.map((r) => r.time);
    });
  },

  async getAdmin(id) {
    const res = await query(`${ADMIN_SELECT} WHERE a.id = $1`, [id]);
    return res.rows[0] ? toAdmin(res.rows[0]) : null;
  },

  async listAdmins(slug) {
    const res = await query(`${ADMIN_SELECT} WHERE t.slug = $1 ORDER BY a.created_at`, [norm(slug)]);
    return res.rows.map(toAdmin);
  },

  async createAdmin(a) {
    const tid = await tenantId(db, a.tenantSlug);
    await query(
      `INSERT INTO admins (id, tenant_id, email, name, role, invited, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [a.id, tid, a.email.trim().toLowerCase(), a.name, a.role, a.invited ?? false, a.createdBy ?? null]
    );
  },

  async updateAdmin(id, patch) {
    const sets: string[] = ['updated_at = now()'];
    const params: unknown[] = [id];
    if (patch.name !== undefined) {
      params.push(patch.name);
      sets.push(`name = $${params.length}`);
    }
    if (patch.role !== undefined) {
      params.push(patch.role);
      sets.push(`role = $${params.length}`);
    }
    await query(`UPDATE admins SET ${sets.join(', ')} WHERE id = $1`, params);
  },

  async deleteAdmin(id) {
    await query('DELETE FROM admins WHERE id = $1', [id]);
  },

  async hasAdmins(slug) {
    const res = await query(
      'SELECT EXISTS (SELECT 1 FROM admins a JOIN tenants t ON t.id = a.tenant_id WHERE t.slug = $1) AS has',
      [norm(slug)]
    );
    return res.rows[0].has === true;
  },
};
