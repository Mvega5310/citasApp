import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { authorizeAdmin } from '@/lib/server/authorization';
import { isStoreConfigured, store } from '@/lib/server/data';
import { barberoDeLaCuenta, soloDeEseBarbero } from '@/lib/server/alcance';

export const dynamic = 'force-dynamic';

// Citas de la barbería del admin, más recientes primero
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (isStoreConfigured()) {
    try {
      const todas = await store().listAppointments(auth.tenant.slug);
      // Una cuenta vinculada a un barbero solo ve sus citas. Se filtra aquí y
      // no en el navegador: si no, las de los compañeros viajarían igual.
      const miBarbero = await barberoDeLaCuenta(auth.session);
      const rows = soloDeEseBarbero(todas, miBarbero);
      return NextResponse.json({ rows, count: rows.length, soloMias: miBarbero !== null });
    } catch (error) {
      logger.warn('admin_appointments_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  return NextResponse.json({ error: 'No se pudo obtener las citas' }, { status: 503 });
}
