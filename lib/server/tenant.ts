import { adminDb, isFirebaseConfigured } from './firebaseAdmin';
import type { TenantConfig } from '@/types';

// globalThis persiste entre recargas HMR en desarrollo
declare global {
  // eslint-disable-next-line no-var
  var _tenantCache: Map<string, { data: TenantConfig | null; expiresAt: number }> | undefined;
}
globalThis._tenantCache ??= new Map();
const cache = globalThis._tenantCache;
const TTL_MS = 60_000;

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  if (!isFirebaseConfigured || !slug) return null;

  const cached = cache.get(slug);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const snap = await Promise.race([
      adminDb().collection('tenants').doc(slug).get(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
    ]);

    const data = snap?.exists ? ({ slug, ...snap.data() } as TenantConfig) : null;
    cache.set(slug, { data, expiresAt: Date.now() + TTL_MS });
    return data;
  } catch {
    cache.set(slug, { data: null, expiresAt: Date.now() + 5_000 });
    return null;
  }
}
