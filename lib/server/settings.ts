import { adminDb, isFirebaseConfigured } from './firebaseAdmin';
import { DEFAULT_TENANT_SLUG, getTenantConfig, type RequestTenant } from './tenant';
import type { NotifyRecipients } from './email';
import { logger } from './logger';

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

// Valores iniciales de la barbería por defecto (los mismos que había antes)
export const DEFAULTS: SalonSettings = {
  salonName: 'Marcos BarberShop',
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

export const TEXT_FIELDS = [
  'salonName', 'phone', 'address', 'city', 'contactEmail', 'instagram', 'facebook', 'whatsapp',
] as const;
export const BOOLEAN_FIELDS = ['notifyClient', 'notifyAdmin'] as const;
export const MAX_TEXT_LENGTH = 200;

// Valores iniciales de una barbería: los de su ficha en tenants/, si existe.
export function defaultsFor(tenant: RequestTenant): SalonSettings {
  const c = tenant.config;
  if (!c || tenant.slug === DEFAULT_TENANT_SLUG) return DEFAULTS;
  return {
    salonName: c.name ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    city: '',
    contactEmail: c.email ?? '',
    instagram: c.instagramUrl ?? '',
    facebook: c.facebookUrl ?? '',
    whatsapp: c.whatsapp ?? '',
    notifyClient: true,
    notifyAdmin: true,
  };
}

// Configuración propia de cada barbería
export const settingsRef = (slug: string) =>
  adminDb().collection('tenants').doc(slug).collection('settings').doc('salon');

// Documento global anterior: solo pertenece a la barbería por defecto
const legacyRef = () => adminDb().collection('settings').doc('salon');

export async function readSettings(tenant: RequestTenant): Promise<SalonSettings> {
  const defaults = defaultsFor(tenant);
  const doc = await settingsRef(tenant.slug).get();
  if (doc.exists) return { ...defaults, ...doc.data() };

  if (tenant.slug === DEFAULT_TENANT_SLUG) {
    const legacy = await legacyRef().get();
    if (legacy.exists) return { ...defaults, ...legacy.data() };
  }
  return defaults;
}

/** Configuración de la barbería; ante cualquier error devuelve sus valores iniciales. */
export async function getSettingsSafe(tenant: RequestTenant): Promise<SalonSettings> {
  if (!isFirebaseConfigured) return defaultsFor(tenant);
  try {
    return await readSettings(tenant);
  } catch (error) {
    logger.warn('settings_read_failed', { tenant: tenant.slug, error: error instanceof Error ? error.message : 'unknown' });
    return defaultsFor(tenant);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A quién se notifica en esta barbería.
 * - Negocio: la barbería por defecto conserva EMAIL_TO_DEFAULT; las demás usan el
 *   correo de su Configuración (nunca el de otra barbería).
 * - Respeta las casillas "Notificar al cliente / al administrador".
 */
function businessEmailFrom(tenant: RequestTenant, settings: SalonSettings): string {
  return tenant.slug === DEFAULT_TENANT_SLUG
    ? process.env.EMAIL_TO_DEFAULT || settings.contactEmail
    : settings.contactEmail;
}

/** Correo del negocio (p. ej. para el formulario de contacto), o null si no es válido. */
export async function businessEmailFor(tenant: RequestTenant): Promise<string | null> {
  const email = businessEmailFrom(tenant, await getSettingsSafe(tenant));
  return EMAIL_RE.test(email ?? '') ? email : null;
}

/** Barbería a partir de un slug ya validado (p. ej. el de un enlace de cancelación firmado). */
export async function tenantFromSlug(slug: string | undefined): Promise<RequestTenant> {
  const s = slug || DEFAULT_TENANT_SLUG;
  return { slug: s, config: await getTenantConfig(s) };
}

export async function recipientsFor(tenant: RequestTenant): Promise<NotifyRecipients> {
  const settings = await getSettingsSafe(tenant);
  const businessEmail = businessEmailFrom(tenant, settings);
  return {
    admin: settings.notifyAdmin && EMAIL_RE.test(businessEmail ?? '') ? businessEmail : null,
    client: settings.notifyClient,
  };
}
