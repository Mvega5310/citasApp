import { NextResponse } from 'next/server';
import { cleanText, isValidUuid, parsePaginationParams } from '@/lib/api';
import { ensureSchema, getPool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = cleanText(body?.userId);
    const clientId = cleanText(body?.clientId);
    const provider = cleanText(body?.provider).toLowerCase();
    const intentId = cleanText(body?.intentId) || null;
    const status = cleanText(body?.status).toLowerCase();
    const currency = cleanText(body?.currency || 'COP').toUpperCase();
    const amountCents = Number(body?.amountCents);
    const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

    if (!provider || !status || !Number.isFinite(amountCents)) {
      return NextResponse.json({ error: 'provider, status y amountCents son requeridos' }, { status: 400 });
    }

    if (amountCents <= 0 || !Number.isInteger(amountCents)) {
      return NextResponse.json({ error: 'amountCents debe ser un entero positivo' }, { status: 400 });
    }

    if (userId && !isValidUuid(userId)) {
      return NextResponse.json({ error: 'userId no es un UUID válido' }, { status: 400 });
    }

    if (clientId && !isValidUuid(clientId)) {
      return NextResponse.json({ error: 'clientId no es un UUID válido' }, { status: 400 });
    }

    await ensureSchema();
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO payments(user_id, client_id, provider, intent_id, status, amount_cents, currency, metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at',
      [userId || null, clientId || null, provider, intentId, status, amountCents, currency, metadata]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error registrando pago';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { limit, offset } = parsePaginationParams(request.url);
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query(
      'SELECT id, user_id, client_id, provider, intent_id, status, amount_cents, currency, metadata, created_at FROM payments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return NextResponse.json({ rows: res.rows, count: res.rows.length, limit, offset });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error listando pagos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
