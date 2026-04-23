import { NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { logger } from '@/lib/server/logger';

export type SalonSettings = {
  salonName: string;
  phone: string;
  address: string;
  city: string;
  contactEmail: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  notifyClient: boolean;
  notifyAdmin: boolean;
};

const DEFAULTS: SalonSettings = {
  salonName: 'BeautyTurno',
  phone: '+57 300 123 4567',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  contactEmail: 'info@beautyturno.com',
  instagram: '',
  facebook: '',
  whatsapp: '',
  notifyClient: true,
  notifyAdmin: true,
};

export async function GET() {
  if (isFirebaseConfigured) {
    try {
      const doc = await adminDb().collection('settings').doc('salon').get();
      const data = doc.exists ? { ...DEFAULTS, ...doc.data() } : DEFAULTS;
      return NextResponse.json(data);
    } catch (error) {
      logger.warn('settings_get_failed', { error: error instanceof Error ? error.message : 'unknown' });
    }
  }
  return NextResponse.json(DEFAULTS);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const allowed: (keyof SalonSettings)[] = [
      'salonName', 'phone', 'address', 'city', 'contactEmail',
      'instagram', 'facebook', 'whatsapp', 'notifyClient', 'notifyAdmin',
    ];

    const update: Partial<SalonSettings> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key] as never;
    }

    if (isFirebaseConfigured) {
      await adminDb().collection('settings').doc('salon').set(update, { merge: true });
    }

    return NextResponse.json({ ok: true, settings: update });
  } catch (error) {
    logger.error('settings_patch_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Error al guardar la configuración' }, { status: 500 });
  }
}
