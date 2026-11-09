import { NextResponse } from 'next/server';
import { runReminders } from '@/lib/server/reminders';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Sin clave solo se permite en desarrollo; en producción cualquiera podría disparar correos
  if (!secret) return process.env.NODE_ENV !== 'production';
  // La tarea programada (Railway, Vercel o cron-job.org) envía: Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.json(await runReminders());
}
