import { NextResponse } from 'next/server';
import { authorizePlatformAdmin } from '@/lib/server/platform';
import { store, TenantHasDataError } from '@/lib/server/data';
import { DEFAULT_TENANT_SLUG } from '@/lib/server/tenantDefaults';
import { logger } from '@/lib/server/logger';

type Ctx = { params: { slug: string } };

/**
 * La barbería por defecto no se toca: es la del dueño de la plataforma y la
 * que atiende el dominio raíz. Suspenderla dejaría el sitio principal
 * devolviendo 403 a todo el mundo, y borrarla es sencillamente irreversible.
 */
function esIntocable(slug: string): boolean {
  return slug === DEFAULT_TENANT_SLUG;
}

/** Activar o suspender. */
export async function PATCH(request: Request, { params }: Ctx) {
  const authorized = await authorizePlatformAdmin(request);
  if (!authorized.ok) return authorized.response;

  const slug = params.slug.trim().toLowerCase();
  if (esIntocable(slug)) {
    return NextResponse.json({ error: 'La barbería principal no se puede suspender.' }, { status: 400 });
  }

  let status: string;
  try {
    status = String((await request.json())?.status ?? '');
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (status !== 'active' && status !== 'suspended') {
    return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 });
  }

  try {
    await store().setTenantStatus(slug, status);
    logger.info('tenant_status_changed', { slug, status, by: authorized.session.uid });
    return NextResponse.json({ ok: true, slug, status });
  } catch (error) {
    logger.error('tenant_status_failed', { slug, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo cambiar el estado' }, { status: 500 });
  }
}

/** Borrar. Solo si no tiene citas: son datos de clientes reales. */
export async function DELETE(request: Request, { params }: Ctx) {
  const authorized = await authorizePlatformAdmin(request);
  if (!authorized.ok) return authorized.response;

  const slug = params.slug.trim().toLowerCase();
  if (esIntocable(slug)) {
    return NextResponse.json({ error: 'La barbería principal no se puede borrar.' }, { status: 400 });
  }

  try {
    await store().deleteTenant(slug);
    logger.info('tenant_deleted', { slug, by: authorized.session.uid });
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    if (error instanceof TenantHasDataError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error('tenant_delete_failed', { slug, error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'No se pudo borrar la barbería' }, { status: 500 });
  }
}
