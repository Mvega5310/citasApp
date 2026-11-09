/**
 * Envía a cada admin sin contraseña un correo con su enlace para crearla
 * (paso 5 de la migración: los admins se copiaron de Firebase sin contraseña).
 *
 * - Solo a admins que todavía no tienen contraseña; nunca toca a quien ya la creó.
 * - Cada enlace es de un solo uso y vence en 72 horas. Si se vuelve a ejecutar,
 *   el enlace anterior de ese admin deja de servir y vale solo el nuevo.
 * - Los enlaces apuntan a la dirección pública: APP_URL para la barbería por
 *   defecto y https://{barbería}.{NEXT_PUBLIC_APP_DOMAIN} para las demás.
 *
 * Uso:
 *   npm run admins:setup-emails                              → muestra a quién se enviaría (base de pruebas)
 *   npm run admins:setup-emails -- --target=app              → muestra a quién se enviaría (base real)
 *   npm run admins:setup-emails -- --target=app --send --yes → envía los correos (base real)
 *   … --only=correo@dominio.com → solo a ese admin
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const argv = process.argv.slice(2);
const args = new Set(argv);
const TARGET = args.has('--target=app') ? 'app' : 'test';
const SEND = args.has('--send');
const ONLY = argv.find((a) => a.startsWith('--only='))?.slice('--only='.length).trim().toLowerCase() || null;

if (SEND && TARGET === 'app' && !args.has('--yes')) {
  console.error('Para enviar correos a los admins reales agrega --yes (sin --send solo se muestra la lista).');
  process.exit(1);
}

// Siempre Postgres; la base se fija antes de cargar el módulo de Postgres
process.env.DATA_BACKEND = 'postgres';
{
  const base = new URL(process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL || 'postgres://invalido');
  if (TARGET === 'test') base.pathname = '/citas_test';
  process.env.DATABASE_URL = base.toString();
}

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);

/** Dirección pública de cada barbería (misma regla que la app en producción). */
function originFor(slug: string, defaultSlug: string): string | null {
  if (slug === defaultSlug) return process.env.APP_URL?.replace(/\/$/, '') || null;
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  return domain ? `https://${slug}.${domain}` : null;
}

async function main() {
  const { pg, query } = await import('../lib/server/pg');
  const { auth } = await import('../lib/server/auth');
  const { sendPasswordLinkEmail, isEmailConfigured } = await import('../lib/server/email');
  const { emailContextFor, tenantFromSlug } = await import('../lib/server/settings');
  const { DEFAULT_TENANT_SLUG } = await import('../lib/server/tenantDefaults');

  const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
  const rows = (
    await query<{ slug: string; email: string; name: string; role: string }>(
      `SELECT t.slug, a.email, a.name, a.role
         FROM admins a JOIN tenants t ON t.id = a.tenant_id
        WHERE a.password_hash IS NULL AND ($1::text IS NULL OR a.email = $1)
        ORDER BY t.slug, a.email`,
      [ONLY]
    )
  ).rows;

  console.log(`Base: ${dbName} · admins sin contraseña${ONLY ? ` (${ONLY})` : ''}: ${rows.length}\n`);
  if (rows.length === 0) {
    await pg().end();
    return;
  }

  // Revisar todo antes de crear un solo enlace
  const problems: string[] = [];
  for (const slug of [...new Set(rows.map((r) => r.slug))]) {
    const origin = originFor(slug, DEFAULT_TENANT_SLUG);
    if (!origin) {
      problems.push(
        slug === DEFAULT_TENANT_SLUG
          ? 'Falta APP_URL (dirección pública de la app).'
          : `Falta NEXT_PUBLIC_APP_DOMAIN (dirección de la barbería "${slug}").`
      );
    } else if (TARGET === 'app' && isLocal(origin)) {
      problems.push(`La dirección de "${slug}" es local (${origin}): los admins reales no podrían abrir el enlace.`);
    }
  }
  if (SEND && !isEmailConfigured()) problems.push('No hay forma de enviar correos: falta RESEND_API_KEY (o el SMTP).');
  if (SEND && !process.env.EMAIL_FROM) problems.push('Falta EMAIL_FROM (remitente, p. ej. "Marcos BarberShop <citas@proyects.store>").');

  for (const r of rows) {
    const origin = originFor(r.slug, DEFAULT_TENANT_SLUG) ?? '(sin dirección)';
    console.log(`  ${r.slug.padEnd(12)} ${r.email.padEnd(36)} ${r.role.padEnd(7)} → ${origin}/admin/password?token=…`);
  }
  console.log('');

  if (problems.length) {
    problems.forEach((p) => console.error(`✘ ${p}`));
    await pg().end();
    process.exit(1);
  }
  if (!SEND) {
    console.log('Solo vista previa: no se creó ningún enlace ni se envió nada. Agrega --send para enviar.');
    await pg().end();
    return;
  }

  let sent = 0;
  for (const r of rows) {
    const tenant = await tenantFromSlug(r.slug);
    const link = await auth().resetLink(r.slug, r.email, originFor(r.slug, DEFAULT_TENANT_SLUG)!);
    if (!link || link.purpose !== 'setup') {
      console.log(`  – ${r.email}: ya no aplica (creó su contraseña mientras tanto)`);
      continue;
    }
    const ok = await sendPasswordLinkEmail({
      brand: (await emailContextFor(tenant)).brand,
      name: link.admin.name,
      email: link.admin.email,
      link: link.link,
      purpose: 'setup',
      expiresIn: link.expiresIn,
    });
    if (ok) sent++;
    console.log(`  ${ok ? '✔' : '✘'} ${r.email}${ok ? '' : ' — no se pudo enviar (revisa Resend: dominio verificado y API key)'}`);
  }

  console.log(`\nEnviados: ${sent}/${rows.length}. Los enlaces vencen en 72 horas.`);
  await pg().end();
  process.exit(sent === rows.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
