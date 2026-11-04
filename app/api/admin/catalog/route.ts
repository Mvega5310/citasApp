import { NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { authorizeAdmin } from '@/lib/server/authorization';
import { editableCatalogFor, validateCatalogInput } from '@/lib/server/catalog';
import { invalidateTenantCache } from '@/lib/server/tenant';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';

// Catálogo editable (incluye servicios desactivados) de la barbería del admin
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json(editableCatalogFor(auth.tenant));
}

// Guarda servicios y horario general. Solo el rol "admin".
export async function PUT(request: Request) {
  const auth = await authorizeAdmin(request, { role: 'admin' });
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const result = validateCatalogInput(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (!isFirebaseConfigured) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
  }

  const slug = auth.tenant.slug;
  try {
    await adminDb()
      .collection('tenants')
      .doc(slug)
      .set(
        {
          services: result.data.services,
          workingHours: result.data.workingHours,
          catalogUpdatedAt: new Date().toISOString(),
          catalogUpdatedBy: auth.session.uid,
        },
        { merge: true }
      );
    invalidateTenantCache(slug);
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    logger.error('catalog_save_failed', {
      tenant: slug,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'No se pudo guardar el catálogo' }, { status: 500 });
  }
}
