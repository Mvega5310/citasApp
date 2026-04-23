import { Pool } from 'pg';

let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    const conn = process.env.DATABASE_URL;
    if (!conn) {
      throw new Error('DATABASE_URL no configurada');
    }
    pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
};

export async function ensureSchema() {
  const p = getPool();
  await p.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID,
      user_id UUID,
      provider TEXT NOT NULL,
      intent_id TEXT,
      status TEXT NOT NULL,
      amount_cents BIGINT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'COP',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_whatsapp TEXT NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL DEFAULT 'postgres',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
  `);
}
