/**
 * Aplica las migraciones pendientes de db/migrations (en orden, una sola vez cada una).
 *
 * Uso:
 *   npm run db:migrate         → base de datos de la app (DATABASE_URL o RAILWAY_DATABASE_URL)
 *   npm run db:migrate:test    → base de pruebas "citas_test" (se crea si no existe)
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { Client } from 'pg';

loadEnvConfig(process.cwd());

const TEST_DB = 'citas_test';
const isTest = process.argv.includes('--test');
const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

function baseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL o RAILWAY_DATABASE_URL');
  return url;
}

const ssl = (url: string) => (/\.railway\.internal[:/]/.test(url) ? false : { rejectUnauthorized: false });

function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

/** Muestra solo host y base, nunca la contraseña. */
const describe = (url: string) => {
  const u = new URL(url);
  return `${u.hostname}${u.pathname}`;
};

async function ensureTestDatabase(url: string) {
  const admin = new Client({ connectionString: url, ssl: ssl(url) });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${TEST_DB}`);
      console.log(`Base de pruebas "${TEST_DB}" creada`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  let url = baseUrl();
  if (isTest) {
    await ensureTestDatabase(url);
    url = withDatabase(url, TEST_DB);
  }

  const client = new Client({ connectionString: url, ssl: ssl(url) });
  await client.connect();
  try {
    // Evita que dos procesos migren al mismo tiempo
    await client.query('SELECT pg_advisory_lock(7231001)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const applied = new Set(
      (await client.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map((r) => r.version)
    );
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const pending = files.filter((f) => !applied.has(f));

    console.log(`Base: ${describe(url)} · migraciones aplicadas: ${applied.size} · pendientes: ${pending.length}`);

    for (const file of pending) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✔ ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${file}: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(7231001)').catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
