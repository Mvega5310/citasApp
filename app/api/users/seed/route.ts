import { NextResponse } from 'next/server';
import { getPool } from '@/lib/server/db';
import { randomUUID } from 'crypto';

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  const header = request.headers.get('x-admin-secret');
  return !!secret && header === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const id = randomUUID();
    const email = process.env.EMAIL_TO_DEFAULT || 'admin@beautyturno.com';
    const name = 'Admin';
    const role = 'admin';

    const res = await pool.query(
      `INSERT INTO users(id, email, name, "role")
       VALUES($1,$2,$3,$4)
       ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, "role"=EXCLUDED."role"
       RETURNING id, email, name, "role", created_at`,
      [id, email, name, role]
    );
    return NextResponse.json({ ok: true, user: res.rows[0] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'insert_error';
    return NextResponse.json({ ok: false, error: msg });
  }
}
