import { NextResponse } from 'next/server';
import { sendBookingNotification } from '@/lib/server/email';

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
    const result = await sendBookingNotification({
      serviceName: 'Prueba de Reserva',
      clientName: 'Cliente de Prueba',
      clientEmail: 'test@example.com',
      clientWhatsApp: '+573024075828',
      date: new Date().toISOString().slice(0, 10),
      time: '10:00',
    });
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo enviar el correo' }, { status: 500 });
  }
}
