import { NextResponse } from 'next/server';
import { getPool } from '@/lib/server/db';

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL no configurada' },
        { status: 500 }
      );
    }
    const pool = getPool();
    const res = await pool.query('select current_database() as db, now() as ts');
    const row = res.rows[0];
    return NextResponse.json({
      ok: true,
      database: row?.db,
      timestamp: row?.ts,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error de conexión' },
      { status: 500 }
    );
  }
}

