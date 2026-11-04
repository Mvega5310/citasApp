import { NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from './firebaseAdmin';
import type { TenantConfig } from '@/types';

// Barbería por defecto (modo de una sola barbería / desarrollo local).
// Funciona aunque no exista su documento en `tenants/`, igual que antes.
export const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'demo';

// Subdominios que no son barberías y se tratan como la barbería por defecto.
const RESERVED_SLUGS = new Set(['www']);

// Formato de slug válido: minúsculas, números y guiones (como un subdominio).
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

type TenantLookup =
  | { status: 'found'; config: TenantConfig }
  | { status: 'missing' }
  | { status: 'unavailable' };

// globalThis persiste entre recargas HMR en desarrollo
declare global {
  // eslint-disable-next-line no-var
  var _tenantCache: Map<string, { data: TenantLookup; expiresAt: number }> | undefined;
}
globalThis._tenantCache ??= new Map();
const cache = globalThis._tenantCache;
const TTL_MS = 60_000;
const LOOKUP_TIMEOUT_MS = 800;

// Distingue "no existe" de "no se pudo consultar" para no rechazar una barbería
// real solo porque Firestore tardó en responder.
async function lookupTenant(slug: string): Promise<TenantLookup> {
  if (!isFirebaseConfigured || !slug) return { status: 'unavailable' };

  const cached = cache.get(slug);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const snap = await Promise.race([
      adminDb().collection('tenants').doc(slug).get(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)),
    ]);
    if (!snap) return { status: 'unavailable' }; // timeout: no se guarda en caché

    const data: TenantLookup = snap.exists
      ? { status: 'found', config: { slug, ...snap.data() } as TenantConfig }
      : { status: 'missing' };
    cache.set(slug, { data, expiresAt: Date.now() + TTL_MS });
    return data;
  } catch {
    return { status: 'unavailable' };
  }
}

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  const result = await lookupTenant(slug);
  return result.status === 'found' ? result.config : null;
}

export type RequestTenant = {
  slug: string;
  /** null en la barbería por defecto cuando todavía no tiene documento en `tenants/`. */
  config: TenantConfig | null;
};

type ResolveResult = { ok: true; tenant: RequestTenant } | { ok: false; response: NextResponse };

const deny = (error: string, status: number): ResolveResult => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

/**
 * Resolutor único de la barbería de una petición.
 *
 * El slug viene del header `x-tenant-slug`, que el middleware siempre
 * sobrescribe a partir del host (el navegador no puede imponerlo).
 * - Barbería por defecto: permitida aunque no tenga documento; solo se bloquea si está marcada inactiva.
 * - Cualquier otra: debe existir en `tenants/` y no estar inactiva.
 */
export async function resolveRequestTenant(request: Request): Promise<ResolveResult> {
  const raw = (request.headers.get('x-tenant-slug') ?? '').trim().toLowerCase();
  const slug = !raw || RESERVED_SLUGS.has(raw) ? DEFAULT_TENANT_SLUG : raw;

  if (!SLUG_RE.test(slug)) return deny('Barbería no encontrada', 404);

  const lookup = await lookupTenant(slug);

  if (lookup.status === 'found') {
    if (lookup.config.active === false) return deny('Esta barbería no está disponible por el momento', 403);
    return { ok: true, tenant: { slug, config: lookup.config } };
  }

  if (slug === DEFAULT_TENANT_SLUG) {
    return { ok: true, tenant: { slug, config: null } };
  }

  if (lookup.status === 'missing') return deny('Barbería no encontrada', 404);
  return deny('Servicio no disponible, intenta de nuevo en unos segundos', 503);
}
