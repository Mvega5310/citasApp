import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST() {
  try {
    const pool = getPool();
    const id = randomUUID();
    const email = 'admin@example.com';
    const name = 'Admin';
    const role = 'admin';
    const res = await pool.query(
      'INSERT INTO users(id, email, name, "role") VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, "role"=EXCLUDED."role" RETURNING id, email, name, "role", created_at',
      [id, email, name, role]
    );
    return NextResponse.json({ ok: true, user: res.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'insert_error' });
  }
}

