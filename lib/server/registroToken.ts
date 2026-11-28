import { SignJWT, jwtVerify } from 'jose';

/**
 * Enlace de verificación del registro directo de una barbería nueva.
 *
 * No hay tabla de "registros pendientes": los datos del formulario van
 * firmados dentro del propio enlace que se manda al correo. Si nadie hace
 * clic, no queda ningún rastro que limpiar; si hace clic dos veces (algunos
 * clientes de correo abren los enlaces solos para revisarlos antes de que la
 * persona los vea), `/registro/confirmar` es idempotente porque la barbería
 * ya habrá quedado creada la primera vez.
 */
export type RegistroTokenPayload = {
  slug: string;
  name: string;
  adminName: string;
  adminEmail: string;
};

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_SECRET ?? 'registro-secret-fallback');
}

export async function generarTokenRegistro(payload: RegistroTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret());
}

export async function verificarTokenRegistro(token: string): Promise<RegistroTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const { slug, name, adminName, adminEmail } = payload as Record<string, unknown>;
    if (
      typeof slug !== 'string' || typeof name !== 'string' ||
      typeof adminName !== 'string' || typeof adminEmail !== 'string'
    ) {
      return null;
    }
    return { slug, name, adminName, adminEmail };
  } catch {
    return null;
  }
}
