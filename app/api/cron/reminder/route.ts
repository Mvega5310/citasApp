import { NextResponse } from 'next/server';
import { runReminders } from '@/lib/server/reminders';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured — allow (useful in dev)
  const auth = request.headers.get('authorization') ?? '';
  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  // External callers (cron-job.org) can send the same header
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.json(await runReminders());
}
