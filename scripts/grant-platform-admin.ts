/**
 * Otorga (o retira) la marca de operador de la plataforma a un admin.
 *
 * Es la única puerta de entrada: el primer operador no se puede crear desde
 * el panel, porque para entrar al panel de plataforma ya hace falta serlo.
 *
 * Uso:
 *   npm run platform:grant -- correo@ejemplo.com
 *   npm run platform:grant -- correo@ejemplo.com --quitar
 *   npm run platform:grant -- --listar
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { Client } from 'pg';

const args = process.argv.slice(2);
const QUITAR = args.includes('--quitar');
const LISTAR = args.includes('--listar');
const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase() ?? '';

function url(): string {
  const u = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
  if (!u) throw new Error('Falta DATABASE_URL o RAILWAY_DATABASE_URL');
  return u;
}

const ssl = (u: string) => (/\.railway\.internal[:/]/.test(u) ? false : { rejectUnauthorized: false });

async function main() {
  const u = url();
  const c = new Client({ connectionString: u, ssl: ssl(u) });
  await c.connect();
  try {
    console.log(`Base: ${new URL(u).hostname}${new URL(u).pathname}\n`);

    if (LISTAR || !email) {
      const res = await c.query<{ email: string; slug: string; role: string }>(
        `SELECT a.email, t.slug, a.role FROM admins a JOIN tenants t ON t.id = a.tenant_id
         WHERE a.platform_admin ORDER BY a.email`
      );
      console.log(`Operadores de la plataforma: ${res.rowCount}`);
      for (const r of res.rows) console.log(`  ${r.email.padEnd(36)} barbería=${r.slug} rol=${r.role}`);
      if (!email && !LISTAR) {
        console.log('\nPara otorgar: npm run platform:grant -- correo@ejemplo.com');
      }
      return;
    }

    const existe = await c.query<{ id: string; slug: string }>(
      `SELECT a.id, t.slug FROM admins a JOIN tenants t ON t.id = a.tenant_id WHERE a.email = $1`,
      [email]
    );
    if (existe.rowCount === 0) {
      console.error(`No hay ningún admin con el correo ${email}.`);
      process.exitCode = 1;
      return;
    }
    if (existe.rowCount! > 1) {
      console.error(
        `Ese correo existe en ${existe.rowCount} barberías (${existe.rows.map((r) => r.slug).join(', ')}).\n` +
          'Resuélvelo a mano: la marca es por cuenta, no por correo.'
      );
      process.exitCode = 1;
      return;
    }

    await c.query('UPDATE admins SET platform_admin = $2, updated_at = now() WHERE id = $1', [
      existe.rows[0].id,
      !QUITAR,
    ]);
    console.log(
      QUITAR
        ? `Retirada la marca de operador a ${email}.`
        : `${email} (barbería "${existe.rows[0].slug}") ya puede crear barberías.\n` +
            'Tiene que cerrar sesión y volver a entrar para que su sesión la lleve.'
    );
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
