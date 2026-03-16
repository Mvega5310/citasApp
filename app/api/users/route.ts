import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { cleanText, isValidEmail, parsePaginationParams } from '@/lib/api';
import { ensureSchema, getPool } from '@/lib/db';

const allowedRoles = new Set(['admin', 'staff']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = cleanText(body?.email).toLowerCase();
    const name = cleanText(body?.name);
    const role = cleanText(body?.role || 'staff').toLowerCase();

    if (!email || !name) {
      return NextResponse.json({ error: 'email y name son requeridos' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El email no es válido' }, { status: 400 });
    }

    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: 'El rol debe ser admin o staff' }, { status: 400 });
    }

    await ensureSchema();
    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query(
      'INSERT INTO users(id, email, name, "role") VALUES($1, $2, $3, $4) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, "role"=EXCLUDED."role" RETURNING id, email, name, "role", created_at',
      [id, email, name, role]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error creando usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { limit, offset } = parsePaginationParams(request.url);
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return NextResponse.json({ rows: res.rows, count: res.rows.length, limit, offset });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error listando usuarios';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
