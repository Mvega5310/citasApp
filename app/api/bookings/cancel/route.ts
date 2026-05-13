import { NextRequest, NextResponse } from 'next/server';
import { verifyCancelToken, msUntilAppointment, CANCEL_WINDOW_MS } from '@/lib/server/cancelToken';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { sendCancellationEmails } from '@/lib/server/email';

function appointmentsCol(db: ReturnType<typeof adminDb>, tenantSlug: string) {
  return tenantSlug
    ? db.collection('tenants').doc(tenantSlug).collection('appointments')
    : db.collection('appointments');
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const payload = await verifyCancelToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 400 });
    }

    const { appointmentId, tenantSlug, date, time, serviceName, clientName } = payload;
    const isLate = msUntilAppointment(date, time) < CANCEL_WINDOW_MS;

    if (!isFirebaseConfigured) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const db = adminDb();
    const ref = appointmentsCol(db, tenantSlug).doc(appointmentId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta cita ya fue cancelada' }, { status: 409 });
    }

    await ref.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'client',
      lateCancel: isLate,
    });

    // Fire emails without blocking the response
    sendCancellationEmails({
      clientName,
      clientEmail: data.clientEmail,
      serviceName,
      date,
      time,
      isLate,
    }).catch(() => {});

    return NextResponse.json({ ok: true, isLate });
  } catch {
    return NextResponse.json({ error: 'Error al cancelar la cita' }, { status: 500 });
  }
}
