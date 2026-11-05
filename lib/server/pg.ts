import pgLib, { Pool, type PoolClient, type QueryResultRow } from 'pg';

// Fechas y horas como texto ("2026-11-04", "10:30"), igual que en la app:
// sin conversiones de zona horaria de JavaScript.
pgLib.types.setTypeParser(1082, (v: string) => v); // date
pgLib.types.setTypeParser(1083, (v: string) => v.slice(0, 5)); // time

/**
 * URL de la base de datos.
 * - En Railway (app y base en la misma red): DATABASE_URL = URL interna.
 * - En desarrollo local: RAILWAY_DATABASE_URL = URL pública (proxy) de Railway.
 */
export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL || null;
}

export const isPostgresConfigured = () => !!getDatabaseUrl();

// La red interna de Railway no usa SSL; la conexión pública sí.
function sslFor(url: string) {
  return /\.railway\.internal[:/]/.test(url) || /@(localhost|127\.0\.0\.1)[:/]/.test(url)
    ? false
    : { rejectUnauthorized: false };
}

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

/** Pool compartido (persiste entre recargas en desarrollo). */
export function pg(): Pool {
  if (globalThis._pgPool) return globalThis._pgPool;
  const url = getDatabaseUrl();
  if (!url) throw new Error('Base de datos no configurada (DATABASE_URL / RAILWAY_DATABASE_URL)');
  globalThis._pgPool = new Pool({
    connectionString: url,
    ssl: sslFor(url),
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return globalThis._pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return pg().query<T>(text, params);
}

/** Ejecuta varias operaciones como una sola: o todas se guardan o ninguna. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pg().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
