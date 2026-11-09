/**
 * Tarea programada de Railway (cada 5 minutos): pide a la app que envíe los
 * recordatorios de las citas que empiezan en los próximos 10 minutos.
 * Sin dependencias: solo Node 18+ (fetch). Termina al responder la app.
 *
 * Variables: APP_URL (dirección pública de la app) y CRON_SECRET (la misma de la app).
 */
const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
const secret = process.env.CRON_SECRET || '';

if (!appUrl || !secret) {
  console.error('Faltan APP_URL o CRON_SECRET en las variables del servicio de recordatorios.');
  process.exit(1);
}

try {
  const res = await fetch(`${appUrl}/api/cron/reminder`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.text();
  console.log(`${new Date().toISOString()} · ${res.status} · ${body.slice(0, 300)}`);
  process.exit(res.ok ? 0 : 1);
} catch (error) {
  console.error(`No se pudo llamar a la app: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
