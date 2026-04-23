import { NextResponse } from 'next/server';
import { cleanText, cleanOptionalText, isValidEmail, isValidPhone } from '@/lib/server/api';
import { sendContactMessage } from '@/lib/server/email';
import { logger } from '@/lib/server/logger';

const VALID_SUBJECTS = ['reserva', 'servicios', 'precios', 'horarios', 'otro'] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = cleanText(body.name);
    const email = cleanText(body.email).toLowerCase();
    const phone = cleanOptionalText(body.phone) ?? undefined;
    const subject = cleanText(body.subject);
    const message = cleanText(body.message);

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Nombre demasiado corto' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    if (!VALID_SUBJECTS.includes(subject as (typeof VALID_SUBJECTS)[number])) {
      return NextResponse.json({ error: 'Asunto inválido' }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'El mensaje es demasiado corto' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'El mensaje es demasiado largo (máx. 2000 caracteres)' }, { status: 400 });
    }
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 });
    }

    const sent = await sendContactMessage({ name, email, phone, subject, message });

    logger.info('contact_message_received', { name, email, subject, sent });

    return NextResponse.json({ ok: true, sent }, { status: 201 });
  } catch (error) {
    logger.error('contact_route_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 500 });
  }
}
