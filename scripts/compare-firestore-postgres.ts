/**
 * Verifica que la app responde lo mismo con Firestore y con Postgres después de la copia.
 * Solo lectura en ambas bases.
 *
 *   npx tsx scripts/compare-firestore-postgres.ts               → compara con citas_test
 *   npx tsx scripts/compare-firestore-postgres.ts --target=app  → compara con la base real
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
const TARGET = process.argv.includes('--target=app') ? 'app' : 'test';
{
  const base = new URL(process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL || 'postgres://invalido');
  if (TARGET === 'test') base.pathname = '/citas_test';
  process.env.DATABASE_URL = base.toString();
}

let fails = 0;
const show = (ok: boolean, name: string, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  const { store } = await import('../lib/server/data');
  const { catalogFor } = await import('../lib/server/catalog');
  const { emailContextFor, getSettingsSafe } = await import('../lib/server/settings');
  const { DEFAULT_TENANT_SLUG } = await import('../lib/server/tenantDefaults');
  const { pg, query } = await import('../lib/server/pg');

  const as = async <T>(backend: 'firestore' | 'postgres', fn: () => Promise<T>): Promise<T> => {
    process.env.DATA_BACKEND = backend;
    return fn();
  };

  const slugs = (await query<{ slug: string }>('SELECT slug FROM tenants ORDER BY slug')).rows.map((r) => r.slug);
  console.log(`Comparando Firestore ↔ Postgres (${new URL(process.env.DATABASE_URL!).pathname.slice(1)}) · barberías: ${slugs.join(', ')}\n`);

  for (const slug of slugs) {
    console.log(`── ${slug} ──`);
    const tenantOf = async (b: 'firestore' | 'postgres') => {
      const r = await as(b, () => store().lookupTenant(slug));
      return { slug, config: r.found ? r.config : null };
    };
    const [tf, tp] = [await tenantOf('firestore'), await tenantOf('postgres')];

    const [cf, cp] = [catalogFor(tf), catalogFor(tp)];
    show(same(cf, cp), 'Catálogo (servicios y horario)', same(cf, cp) ? `${cf.services.length} servicios activos` : `${JSON.stringify(cf).slice(0, 120)} ≠ ${JSON.stringify(cp).slice(0, 120)}`);

    const [sf, sp] = [await as('firestore', () => getSettingsSafe(tf)), await as('postgres', () => getSettingsSafe(tp))];
    show(same(sf, sp), 'Configuración', same(sf, sp) ? sf.salonName : `${JSON.stringify(sf)} ≠ ${JSON.stringify(sp)}`);

    const [ef, ep] = [await as('firestore', () => emailContextFor(tf)), await as('postgres', () => emailContextFor(tp))];
    show(same(ef, ep), 'Correos (destinatarios y marca)', same(ef, ep) ? `${ef.brand.name} · ${ef.brand.address}` : `${JSON.stringify(ef)} ≠ ${JSON.stringify(ep)}`);

    const key = (a: { id: string; date: string; time: string; status: string; clientName: string; clientEmail: string; serviceId: string; serviceName: string; groupId?: string | null }) =>
      [a.id, a.date, a.time, a.status, a.clientName, a.clientEmail.toLowerCase(), a.serviceId, a.serviceName, a.groupId ?? ''].join('|');
    const af = await as('firestore', () => store().listAppointments(slug));
    const ap = await as('postgres', () => store().listAppointments(slug));
    const pByKey = new Set(ap.map(key));
    const missing = af.filter((a) => !pByKey.has(key(a)));
    show(missing.length === 0, 'Cada cita del panel actual existe igual en Postgres', `${af.length - missing.length}/${af.length}` + (missing.length ? ` · distintas: ${missing.slice(0, 3).map((m) => m.id).join(', ')}` : ''));
    const extra = ap.length - af.length;
    if (extra > 0) console.log(`  ℹ Postgres muestra ${extra} citas más: las de la colección antigua, que el panel actual no lista`);

    const dates = [...new Set(af.map((a) => a.date))];
    let blockedDiff = 0;
    for (const date of dates) {
      const [bf, bp] = [await as('firestore', () => store().blockedSlots(slug, date)), await as('postgres', () => store().blockedSlots(slug, date))];
      if (!bf.every((t) => bp.includes(t))) blockedDiff++;
    }
    show(blockedDiff === 0, 'Horarios bloqueados por día', `${dates.length} días revisados`);

    const ad = (list: { id: string; email: string; role: string }[]) => list.map((a) => `${a.id}|${a.email}|${a.role}`).sort();
    const [mf, mp] = [await as('firestore', () => store().listAdmins(slug)), await as('postgres', () => store().listAdmins(slug))];
    show(same(ad(mf), ad(mp)), 'Administradores', `${mp.length}`);

    if (slug === DEFAULT_TENANT_SLUG) {
      const legacyId = ap.find((a) => !af.some((f) => f.id === a.id))?.id;
      if (legacyId) {
        const [gf, gp] = [await as('firestore', () => store().getAppointment(slug, legacyId)), await as('postgres', () => store().getAppointment(slug, legacyId))];
        show(!!gf && !!gp && gf.status === gp.status && gf.date === gp.date, 'Una cita antigua se encuentra igual en ambas (enlaces de cancelación)', legacyId);
      }
    }
    console.log('');
  }

  console.log(fails === 0 ? 'Equivalencia confirmada.' : `${fails} diferencia(s).`);
  await pg().end();
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
