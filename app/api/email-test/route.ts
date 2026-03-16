import { NextResponse } from 'next/server';
import { sendBookingNotification } from '@/lib/email';

export async function POST() {
  try {
    await sendBookingNotification({
      serviceName: 'Prueba de Reserva',
      clientName: 'Cliente de Prueba',
      clientEmail: 'test@example.com',
      clientWhatsApp: '+573001234567',
      date: new Date().toISOString().slice(0, 10),
      time: '10:00',
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'No se pudo enviar el correo' }, { status: 500 });
  }
}

