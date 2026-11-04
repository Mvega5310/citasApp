import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/server/firebaseAdmin';
import { logger } from '@/lib/server/logger';
import { authorizeAdmin } from '@/lib/server/authorization';
import {
  BOOLEAN_FIELDS,
  MAX_TEXT_LENGTH,
  TEXT_FIELDS,
  defaultsFor,
  readSettings,
  settingsRef,
  type SalonSettings,
} from '@/lib/server/settings';

// Acepta solo campos conocidos y con el tipo correcto
function sanitize(body: unknown): { ok: true; update: Partial<SalonSettings> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Cuerpo inválido' };
  const input = body as Record<string, unknown>;
  const update: Partial<SalonSettings> = {};

  for (const key of TEXT_FIELDS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (typeof value !== 'string') return { ok: false, error: `El campo ${key} debe ser texto` };
    const trimmed = value.trim();
    if (trimmed.length > MAX_TEXT_LENGTH) return { ok: false, error: `El campo ${key} es demasiado largo` };
    update[key] = trimmed;
  }
  for (const key of BOOLEAN_FIELDS) {
    if (!(key in input)) continue;
    if (typeof input[key] !== 'boolean') return { ok: false, error: `El campo ${key} debe ser sí/no` };
    update[key] = input[key] as boolean;
  }
  if (update.salonName !== undefined && update.salonName.length < 2) {
    return { ok: false, error: 'El nombre del negocio debe tener al menos 2 caracteres' };
  }
  return { ok: true, update };
}

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  if (isFirebaseConfigured) {
    try {
      return NextResponse.json(await readSettings(auth.tenant));
    } catch (error) {
      logger.warn('settings_get_failed', {
        tenant: auth.tenant.slug,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
  return NextResponse.json(defaultsFor(auth.tenant));
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const result = sanitize(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (!isFirebaseConfigured) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
  }

  try {
    // Se guarda la configuración completa: así la barbería por defecto conserva
    // los valores del documento global anterior la primera vez que guarda.
    const settings: SalonSettings = { ...(await readSettings(auth.tenant)), ...result.update };
    await settingsRef(auth.tenant.slug).set(settings, { merge: true });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    logger.error('settings_patch_failed', {
      tenant: auth.tenant.slug,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Error al guardar la configuración' }, { status: 500 });
  }
}
