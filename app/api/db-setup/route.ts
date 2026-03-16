import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

export async function POST() {
  try {
    await ensureSchema();
    return NextResponse.json({ ok: true, message: 'Schema creado/verificado' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error creando schema' }, { status: 500 });
  }
}

