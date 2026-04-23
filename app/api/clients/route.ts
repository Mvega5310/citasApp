import { NextResponse } from 'next/server';
import {
  cleanOptionalText,
  cleanText,
  isValidEmail,
  isValidPhone,
  isValidUuid,
  parsePaginationParams,
} from '@/lib/server/api';
import { ensureSchema, getPool } from '@/lib/server/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = cleanText(body?.userId);
    const name = cleanText(body?.name);
    const email = cleanOptionalText(body?.email)?.toLowerCase() ?? null;
    const phoneRaw = cleanOptionalText(body?.phone);
    const phone = phoneRaw ? phoneRaw.replace(/[^\d+]/g, '') : null;

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId y name son requeridos' }, { status: 400 });
    }

    if (!isValidUuid(userId)) {
      return NextResponse.json({ error: 'userId no es un UUID válido' }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'El email no es válido' }, { status: 400 });
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'El teléfono no es válido' }, { status: 400 });
    }

    await ensureSchema();
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO clients(user_id, name, email, phone) VALUES($1, $2, $3, $4) RETURNING id, user_id, name, email, phone, created_at',
      [userId, name, email, phone]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error creando cliente';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { limit, offset } = parsePaginationParams(request.url);
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query(
      'SELECT id, user_id, name, email, phone, created_at FROM clients ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return NextResponse.json({ rows: res.rows, count: res.rows.length, limit, offset });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error listando clientes';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
