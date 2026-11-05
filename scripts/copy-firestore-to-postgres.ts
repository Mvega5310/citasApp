/**
 * Copia los datos de Firestore a Postgres (paso 4 de la migración a Railway).
 *
 * - Firestore: SOLO LECTURA. Este script nunca escribe en Firestore.
 * - Postgres: todo en una transacción (o se copia todo o nada) y se puede repetir:
 *   actualiza lo existente en vez de duplicar. Las citas y admins conservan su id.
 * - Lo "antiguo" (colección raíz de citas, bloqueos y configuración global) pasa a
 *   la barbería por defecto, como ya funcionaba en la app.
 * - Los admins se copian SIN contraseña: cada uno la crea con un enlace por correo.
 *
 * Uso:
 *   npx tsx scripts/copy-firestore-to-postgres.ts --dry-run          → solo revisa y muestra el resumen
 *   npx tsx scripts/copy-firestore-to-postgres.ts                    → copia a la base de pruebas (citas_test)
 *   npx tsx scripts/copy-firestore-to-postgres.ts --target=app --yes → copia a la base real de la app
 *   … --fresh → vacía el destino antes de copiar (copia exacta: lo eliminado en Firestore no queda)
 *
 * Citas activas repetidas en el mismo horario (imposibles en Postgres):
 *   por defecto se detiene y las lista; con --resolve-duplicates se conserva la
 *   más antigua activa y las demás se copian como canceladas (se informa cada una).
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const TARGET = args.has('--target=app') ? 'app' : 'test';
const RESOLVE_DUPLICATES = args.has('--resolve-duplicates');
// Vacía el destino antes de copiar (misma transacción): copia exacta para el día del cambio
const FRESH = args.has('--fresh');

if (TARGET === 'app' && !args.has('--yes') && !DRY_RUN) {
  console.error('Para escribir en la base REAL agrega --yes (o usa --dry-run para revisar primero).');
  process.exit(1);
}
if (process.env.FIRESTORE_EMULATOR_HOST && !args.has('--emulator')) {
  console.error('FIRESTORE_EMULATOR_HOST está definido: se leería el emulador. Agrega --emulator si es lo que quieres.');
  process.exit(1);
}

// Base de destino (se fija antes de cargar el módulo de Postgres)
{
  const base = new URL(process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL || 'postgres://invalido');
  if (TARGET === 'test') base.pathname = '/citas_test';
  process.env.DATABASE_URL = base.toString();
}

type Doc = Record<string, unknown>;
type Problem = { kind: string; detail: string };

const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const ACTIVE = ['pending', 'confirmed'];

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const maybe = v as { toDate?: () => Date };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const { adminDb, adminAuth, isFirebaseConfigured } = await import('../lib/server/firebaseAdmin');
  const { withTransaction, pg } = await import('../lib/server/pg');
  const { DEFAULT_TENANT_SLUG, adminTenantOf } = await import('../lib/server/tenantDefaults');
  const { defaultsFor } = await import('../lib/server/settings');
  if (!isFirebaseConfigured) throw new Error('Firebase no está configurado en .env.local');

  const db = adminDb();
  const target = new URL(process.env.DATABASE_URL!);
  console.log(`Origen: Firestore (${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'proyecto'}) · solo lectura`);
  console.log(`Destino: ${target.hostname}${target.pathname}${DRY_RUN ? ' · SIN escribir (--dry-run)' : ''}\n`);

  const problems: Problem[] = [];

  // ── 1. Leer Firestore ─────────────────────────────────────────────────────
  const tenantRefs = await db.collection('tenants').listDocuments();
  const slugs = new Set(tenantRefs.map((r) => r.id));
  slugs.add(DEFAULT_TENANT_SLUG);

  type TenantPlan = {
    slug: string;
    profile: Doc | null; // documento tenants/{slug} (puede no existir)
    settings: Doc | null;
    appointments: { id: string; data: Doc; legacy: boolean }[];
    blocked: { date: string; slots: string[] }[];
  };
  const plans = new Map<string, TenantPlan>();

  for (const slug of slugs) {
    const ref = db.collection('tenants').doc(slug);
    const [doc, settings, appts, blocked] = await Promise.all([
      ref.get(),
      ref.collection('settings').doc('salon').get(),
      ref.collection('appointments').get(),
      ref.collection('blocked_slots').get(),
    ]);
    plans.set(slug, {
      slug,
      profile: doc.exists ? (doc.data() as Doc) : null,
      settings: settings.exists ? (settings.data() as Doc) : null,
      appointments: appts.docs.map((d) => ({ id: d.id, data: d.data() as Doc, legacy: false })),
      blocked: blocked.docs.map((d) => ({ date: d.id, slots: (d.data().slots as string[]) ?? [] })),
    });
  }

  // Lo antiguo → barbería por defecto
  const def = plans.get(DEFAULT_TENANT_SLUG)!;
  const [legacyAppts, legacyBlocked, legacySettings] = await Promise.all([
    db.collection('appointments').get(),
    db.collection('blocked_slots').get(),
    db.collection('settings').doc('salon').get(),
  ]);
  def.appointments.push(...legacyAppts.docs.map((d) => ({ id: d.id, data: d.data() as Doc, legacy: true })));
  def.blocked.push(...legacyBlocked.docs.map((d) => ({ date: d.id, slots: (d.data().slots as string[]) ?? [] })));
  if (!def.settings && legacySettings.exists) def.settings = legacySettings.data() as Doc;

  const adminsSnap = await db.collection('admins').get();

  // ── 2. Revisar y normalizar ───────────────────────────────────────────────
  type ApptRow = {
    id: string; slug: string; serviceId: string; serviceName: string; clientName: string; clientEmail: string;
    clientWhatsApp: string; date: string; time: string; status: string; groupId: string | null;
    habeas: boolean; notifications: boolean; reminderSentAt: Date | null; cancelledAt: Date | null;
    cancelledBy: string | null; lateCancel: boolean | null; source: string | null; createdAt: Date; updatedAt: Date;
    legacy: boolean;
  };
  const apptRows: ApptRow[] = [];
  const seenIds = new Set<string>();

  for (const plan of plans.values()) {
    for (const { id, data: a, legacy } of plan.appointments) {
      const where = `${plan.slug}${legacy ? ' (colección antigua)' : ''} / cita ${id}`;
      if (seenIds.has(id)) {
        problems.push({ kind: 'cita con id repetido (se omite la segunda)', detail: where });
        continue;
      }
      const date = str(a.date);
      const time = str(a.time).slice(0, 5);
      if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
        problems.push({ kind: 'cita con fecha u hora inválida (se omite)', detail: `${where}: "${date}" "${a.time}"` });
        continue;
      }
      let status = str(a.status) || 'pending';
      if (!STATUSES.includes(status)) {
        problems.push({ kind: 'estado desconocido (se copia como pendiente)', detail: `${where}: "${status}"` });
        status = 'pending';
      }
      seenIds.add(id);
      const created = toDate(a.createdAt) ?? toDate(a.updatedAt) ?? new Date();
      apptRows.push({
        id, slug: plan.slug, legacy,
        serviceId: str(a.serviceId), serviceName: str(a.serviceName), clientName: str(a.clientName),
        clientEmail: str(a.clientEmail).toLowerCase(), clientWhatsApp: str(a.clientWhatsApp),
        date, time, status, groupId: a.groupId ? str(a.groupId) : null,
        habeas: a.habeasDataAccepted === true, notifications: a.notificationsAccepted === true,
        reminderSentAt: toDate(a.reminderSentAt) ?? (a.reminderSent ? created : null),
        cancelledAt: toDate(a.cancelledAt), cancelledBy: a.cancelledBy ? str(a.cancelledBy) : null,
        lateCancel: typeof a.lateCancel === 'boolean' ? a.lateCancel : null,
        source: a.source ? str(a.source) : 'firebase', createdAt: created, updatedAt: toDate(a.updatedAt) ?? created,
      });
    }
  }

  // Citas activas repetidas en el mismo horario de una barbería
  const bySlot = new Map<string, ApptRow[]>();
  for (const r of apptRows.filter((r) => ACTIVE.includes(r.status))) {
    const key = `${r.slug} ${r.date} ${r.time}`;
    bySlot.set(key, [...(bySlot.get(key) ?? []), r]);
  }
  const duplicates = [...bySlot.entries()].filter(([, rows]) => rows.length > 1);
  for (const [key, rows] of duplicates) {
    const sorted = [...rows].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
    const detail = `${key}: ${sorted.map((r) => `${r.id} (${r.clientName}, ${r.status})`).join(' · ')}`;
    if (RESOLVE_DUPLICATES) {
      for (const extra of sorted.slice(1)) {
        extra.status = 'cancelled';
        extra.cancelledBy = extra.cancelledBy ?? 'migration';
        extra.cancelledAt = extra.cancelledAt ?? new Date();
      }
      problems.push({ kind: 'horario repetido: se conserva la más antigua, las demás se copian canceladas', detail });
    } else {
      problems.push({ kind: 'horario con varias citas activas (BLOQUEA la copia)', detail });
    }
  }

  // Admins
  type AdminRow = { id: string; slug: string; email: string; name: string; role: string; invited: boolean; createdBy: string | null; createdAt: Date };
  const adminRows: AdminRow[] = [];
  const adminEmails = new Set<string>();
  for (const d of adminsSnap.docs) {
    const a = d.data() as Doc;
    let email = str(a.email).trim().toLowerCase();
    if (!email) {
      try {
        email = ((await adminAuth().getUser(d.id)).email ?? '').toLowerCase(); // lectura
      } catch {}
    }
    const slug = adminTenantOf(a);
    if (!email.includes('@')) {
      problems.push({ kind: 'admin sin correo (se omite)', detail: d.id });
      continue;
    }
    if (!slugs.has(slug)) slugs.add(slug);
    if (adminEmails.has(`${slug}:${email}`)) {
      problems.push({ kind: 'admin con correo repetido en la barbería (se omite)', detail: `${slug}: ${email}` });
      continue;
    }
    adminEmails.add(`${slug}:${email}`);
    adminRows.push({
      id: d.id, slug, email, name: str(a.name) || email.split('@')[0], role: a.role === 'admin' ? 'admin' : 'viewer',
      invited: a.invited === true, createdBy: a.createdBy ? str(a.createdBy) : null, createdAt: toDate(a.createdAt) ?? new Date(),
    });
  }

  // ── 3. Resumen ─────────────────────────────────────────────────────────────
  console.log('Barberías:');
  for (const plan of plans.values()) {
    const rows = apptRows.filter((r) => r.slug === plan.slug);
    const legacy = rows.filter((r) => r.legacy).length;
    const services = Array.isArray(plan.profile?.services) ? (plan.profile!.services as unknown[]).length : 0;
    console.log(
      `  · ${plan.slug}${plan.slug === DEFAULT_TENANT_SLUG ? ' (por defecto)' : ''}: ${rows.length} citas` +
        `${legacy ? ` (${legacy} de la colección antigua)` : ''}, ` +
        `${plan.blocked.reduce((n, b) => n + b.slots.length, 0)} horarios bloqueados, ` +
        `ficha: ${plan.profile ? 'sí' : 'no'}, catálogo propio: ${services ? `${services} servicios` : 'no'}, ` +
        `configuración: ${plan.settings ? 'sí' : 'no'}, admins: ${adminRows.filter((a) => a.slug === plan.slug).length}`
    );
  }
  const byStatus = apptRows.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log(`\nCitas por estado: ${JSON.stringify(byStatus)}`);
  console.log(`Admins: ${adminRows.map((a) => `${a.email} (${a.role}, ${a.slug})`).join(' · ') || 'ninguno'}`);

  if (problems.length) {
    console.log(`\nObservaciones (${problems.length}):`);
    const byKind = new Map<string, string[]>();
    for (const p of problems) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p.detail]);
    for (const [kind, details] of byKind) {
      console.log(`  ▸ ${kind}: ${details.length}`);
      for (const d of details.slice(0, 10)) console.log(`      - ${d}`);
      if (details.length > 10) console.log(`      … y ${details.length - 10} más`);
    }
  } else {
    console.log('\nSin observaciones: todos los datos son válidos para Postgres.');
  }

  const blocking = problems.some((p) => p.kind.includes('BLOQUEA'));
  if (DRY_RUN) {
    console.log('\n--dry-run: no se escribió nada.');
    if (blocking) console.log('Para copiar habrá que decidir qué hacer con los horarios repetidos (--resolve-duplicates).');
    await pg().end().catch(() => {});
    return;
  }
  if (blocking) {
    console.error('\nCopia detenida: hay horarios con varias citas activas. Revísalos o usa --resolve-duplicates.');
    process.exit(2);
  }

  // ── 4. Escribir en Postgres (una sola transacción) ─────────────────────────
  await withTransaction(async (c) => {
    if (FRESH) {
      await c.query(
        'TRUNCATE password_tokens, admins, blocked_slots, appointments, working_hours, services, tenant_settings, tenants CASCADE'
      );
      console.log('\n--fresh: destino vaciado (dentro de la transacción: si algo falla, se restaura).');
    }
    const tenantIds = new Map<string, string>();
    for (const slug of slugs) {
      const plan = plans.get(slug);
      const p = plan?.profile ?? {};
      const { services, workingHours, active, name, catalogUpdatedAt, catalogUpdatedBy, slug: _s, ...rest } = p as Doc;
      const res = await c.query<{ id: string }>(
        `INSERT INTO tenants (slug, name, status, profile, catalog_updated_at, catalog_updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, profile = EXCLUDED.profile,
           catalog_updated_at = EXCLUDED.catalog_updated_at, catalog_updated_by = EXCLUDED.catalog_updated_by, updated_at = now()
         RETURNING id`,
        [slug, str(name), active === false ? 'suspended' : 'active', JSON.stringify(rest),
          Array.isArray(services) ? toDate(catalogUpdatedAt) ?? new Date() : null, catalogUpdatedBy ? str(catalogUpdatedBy) : null]
      );
      const tid = res.rows[0].id;
      tenantIds.set(slug, tid);

      // Catálogo (solo si la barbería lo guardó)
      await c.query('DELETE FROM services WHERE tenant_id = $1', [tid]);
      if (Array.isArray(services)) {
        for (const [i, raw] of (services as Doc[]).entries()) {
          const duration = Number(raw.duration);
          const price = Number(raw.price);
          if (!str(raw.id) || str(raw.name).length < 2 || !(duration >= 5 && duration <= 480 && duration % 5 === 0) || !(price >= 0)) {
            console.log(`  ! ${slug}: servicio omitido por datos inválidos: ${JSON.stringify(raw)}`);
            continue;
          }
          await c.query(
            `INSERT INTO services (tenant_id, id, name, description, duration_min, price, active, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [tid, str(raw.id), str(raw.name), str(raw.description).slice(0, 200), duration, Math.round(price), raw.active !== false, i]
          );
        }
      }
      await c.query('DELETE FROM working_hours WHERE tenant_id = $1', [tid]);
      if (workingHours && typeof workingHours === 'object') {
        for (const [weekday, key] of DAY_KEYS.entries()) {
          const d = (workingHours as Record<string, Doc>)[key];
          const open = str(d?.open), close = str(d?.close);
          const valid = TIME_RE.test(open) && TIME_RE.test(close) && open < close;
          await c.query(
            'INSERT INTO working_hours (tenant_id, weekday, open_time, close_time, closed) VALUES ($1, $2, $3, $4, $5)',
            [tid, weekday, valid ? open : '09:00', valid ? close : '18:00', !valid || d?.closed === true]
          );
        }
      }

      // Configuración completa (lo guardado + los valores iniciales de la barbería)
      if (plan?.settings) {
        const s = { ...defaultsFor({ slug, config: plan.profile ? ({ slug, ...plan.profile } as never) : null }), ...plan.settings };
        await c.query(
          `INSERT INTO tenant_settings (tenant_id, salon_name, phone, address, city, contact_email, instagram, facebook,
             whatsapp, notify_client, notify_admin)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (tenant_id) DO UPDATE SET salon_name = EXCLUDED.salon_name, phone = EXCLUDED.phone,
             address = EXCLUDED.address, city = EXCLUDED.city, contact_email = EXCLUDED.contact_email,
             instagram = EXCLUDED.instagram, facebook = EXCLUDED.facebook, whatsapp = EXCLUDED.whatsapp,
             notify_client = EXCLUDED.notify_client, notify_admin = EXCLUDED.notify_admin, updated_at = now()`,
          [tid, str(s.salonName), str(s.phone), str(s.address), str(s.city), str(s.contactEmail), str(s.instagram),
            str(s.facebook), str(s.whatsapp), s.notifyClient !== false, s.notifyAdmin !== false]
        );
      }

      // Horarios bloqueados: se reemplazan por los de Firestore
      await c.query('DELETE FROM blocked_slots WHERE tenant_id = $1', [tid]);
      for (const b of plan?.blocked ?? []) {
        if (!DATE_RE.test(b.date)) continue;
        for (const t of b.slots.filter((t) => TIME_RE.test(t))) {
          await c.query('INSERT INTO blocked_slots (tenant_id, date, time) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [tid, b.date, t]);
        }
      }
    }

    // Citas: primero las inactivas y luego las activas (evita choques al actualizar estados)
    const ordered = [...apptRows].sort((a, b) => Number(ACTIVE.includes(a.status)) - Number(ACTIVE.includes(b.status)));
    for (const r of ordered) {
      await c.query(
        `INSERT INTO appointments (id, tenant_id, service_id, service_name, client_name, client_email, client_whatsapp,
           date, time, status, group_id, habeas_data_accepted, notifications_accepted, reminder_sent_at, cancelled_at,
           cancelled_by, late_cancel, source, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, reminder_sent_at = EXCLUDED.reminder_sent_at,
           cancelled_at = EXCLUDED.cancelled_at, cancelled_by = EXCLUDED.cancelled_by, late_cancel = EXCLUDED.late_cancel,
           updated_at = EXCLUDED.updated_at`,
        [r.id, tenantIds.get(r.slug), r.serviceId, r.serviceName, r.clientName, r.clientEmail, r.clientWhatsApp, r.date,
          r.time, r.status, r.groupId, r.habeas, r.notifications, r.reminderSentAt, r.cancelledAt, r.cancelledBy,
          r.lateCancel, r.source, r.createdAt, r.updatedAt]
      );
    }

    // Admins (sin contraseña; nunca se pisa una contraseña ya creada en Postgres)
    for (const a of adminRows) {
      await c.query(
        `INSERT INTO admins (id, tenant_id, email, name, role, invited, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, email = EXCLUDED.email, name = EXCLUDED.name,
           role = EXCLUDED.role, updated_at = now()`,
        [a.id, tenantIds.get(a.slug), a.email, a.name, a.role, a.invited, a.createdBy, a.createdAt]
      );
    }
  });

  // ── 5. Verificación ────────────────────────────────────────────────────────
  const { query } = await import('../lib/server/pg');
  const counts = await query(
    `SELECT t.slug, (SELECT count(*)::int FROM appointments a WHERE a.tenant_id = t.id) AS citas,
            (SELECT count(*)::int FROM blocked_slots b WHERE b.tenant_id = t.id) AS bloqueos,
            (SELECT count(*)::int FROM admins a WHERE a.tenant_id = t.id) AS admins
     FROM tenants t ORDER BY t.slug`
  );
  console.log('\nCopiado. En Postgres:');
  let ok = true;
  for (const row of counts.rows) {
    const expected = apptRows.filter((r) => r.slug === row.slug).length;
    const match = row.citas >= expected;
    ok &&= match;
    console.log(`  · ${row.slug}: ${row.citas} citas (Firestore: ${expected}) ${match ? '✔' : '✘'}, ${row.bloqueos} bloqueos, ${row.admins} admins`);
  }
  console.log(ok ? '\nVerificación correcta.' : '\n¡Atención! Hay diferencias en la cantidad de citas.');
  await pg().end();
}

main().catch(async (error) => {
  console.error('\nError:', error instanceof Error ? error.message : error);
  process.exit(1);
});
