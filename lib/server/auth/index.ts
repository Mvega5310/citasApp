import { createHash, randomBytes } from 'node:crypto';
import { adminAuth, isFirebaseConfigured } from '../firebaseAdmin';
import { isPostgresConfigured, query, withTransaction } from '../pg';
import { dataBackend, store, type AdminRecord } from '../data';
import { hashPassword, verifyPassword } from './password';

/**
 * Cuentas de administrador. Dos implementaciones, elegidas con DATA_BACKEND:
 * - firestore: Firebase Auth (comportamiento anterior)
 * - postgres: contraseñas propias (scrypt) + enlaces de un solo uso por correo
 */

export class AuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

type NewAccount = {
  tenantSlug: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  createdBy?: string;
};

export interface AuthProvider {
  /** Lanza AuthError si las credenciales no son válidas o el admin no es de esta barbería. */
  login(tenantSlug: string, email: string, password: string): Promise<AdminRecord>;
  /** Crea la cuenta y devuelve el enlace para que el invitado cree su contraseña. */
  invite(account: NewAccount, origin: string): Promise<{ adminId: string; setupLink: string | null; expiresIn: string }>;
  /** Primer admin de una barbería, con contraseña directa (ruta de configuración inicial). */
  createWithPassword(account: NewAccount, password: string): Promise<{ adminId: string }>;
  /** Enlace para restablecer (o crear) la contraseña; null si el correo no tiene cuenta en esta barbería. */
  resetLink(tenantSlug: string, email: string, origin: string): Promise<PasswordLink | null>;
  deleteAccount(adminId: string): Promise<void>;
  renameAccount(adminId: string, name: string): Promise<void>;
  isConfigured(): boolean;
}

export type PasswordLink = { admin: AdminRecord; link: string; purpose: 'setup' | 'reset'; expiresIn: string };

const BAD_CREDENTIALS = 'Correo o contraseña incorrectos';
const normEmail = (email: string) => String(email).trim().toLowerCase();

// ── Firebase Auth (comportamiento anterior) ─────────────────────────────────

const firebaseAuth: AuthProvider = {
  isConfigured: () => isFirebaseConfigured,

  async login(tenantSlug, email, password) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new AuthError('Firebase API key no configurada', 500);

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!res.ok) {
      const code = (await res.json().catch(() => ({})))?.error?.message ?? '';
      if (code.includes('TOO_MANY_ATTEMPTS')) throw new AuthError('Demasiados intentos. Intenta más tarde.', 429);
      throw new AuthError(BAD_CREDENTIALS, 401);
    }
    const { idToken, localId } = await res.json();
    let uid: string;
    try {
      uid = (await adminAuth().verifyIdToken(idToken)).uid ?? localId;
    } catch {
      throw new AuthError('Error de verificación', 401);
    }
    const admin = await store().getAdmin(uid);
    if (!admin) throw new AuthError('No tienes permisos de administrador', 403);
    if (admin.tenantSlug !== tenantSlug) throw new AuthError('No tienes permisos de administrador en esta barbería', 403);
    return admin;
  },

  async invite(account, origin) {
    const tempPassword = randomBytes(24).toString('base64');
    let uid: string;
    try {
      uid = (await adminAuth().createUser({ email: account.email, password: tempPassword, displayName: account.name })).uid;
    } catch (e) {
      throw new AuthError(e instanceof Error ? e.message : 'Error al crear usuario', 400);
    }
    await store().createAdmin({ id: uid, ...account, email: normEmail(account.email), invited: true });
    try {
      const setupLink = await adminAuth().generatePasswordResetLink(account.email, { url: `${origin}/admin/login` });
      return { adminId: uid, setupLink, expiresIn: '1 hora' };
    } catch {
      return { adminId: uid, setupLink: null, expiresIn: '1 hora' };
    }
  },

  async createWithPassword(account, password) {
    let uid: string;
    try {
      uid = (await adminAuth().createUser({ email: account.email, password, displayName: account.name })).uid;
    } catch (e) {
      throw new AuthError(e instanceof Error ? e.message : 'Error al crear usuario', 400);
    }
    await store().createAdmin({ id: uid, ...account, email: normEmail(account.email) });
    return { adminId: uid };
  },

  async resetLink(tenantSlug, email, origin) {
    const admin = (await store().listAdmins(tenantSlug)).find((a) => a.email === normEmail(email));
    if (!admin) return null;
    const link = await adminAuth().generatePasswordResetLink(admin.email, { url: `${origin}/admin/login` });
    return { admin, link, purpose: 'reset', expiresIn: '1 hora' };
  },

  async deleteAccount(adminId) {
    await adminAuth().deleteUser(adminId);
    await store().deleteAdmin(adminId);
  },

  async renameAccount(adminId, name) {
    await adminAuth().updateUser(adminId, { displayName: name });
  },
};

// ── Contraseñas propias (Postgres) ──────────────────────────────────────────

const TOKEN_TTL_MS = { setup: 72 * 60 * 60 * 1000, reset: 60 * 60 * 1000 };
const TOKEN_TTL_LABEL = { setup: '72 horas', reset: '1 hora' };
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Crea un enlace de un solo uso; invalida los anteriores del mismo tipo. */
async function issueToken(adminId: string, purpose: 'setup' | 'reset', origin: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await withTransaction(async (c) => {
    await c.query('DELETE FROM password_tokens WHERE admin_id = $1 AND purpose = $2 AND used_at IS NULL', [adminId, purpose]);
    await c.query(
      `INSERT INTO password_tokens (token_hash, admin_id, purpose, expires_at)
       VALUES ($1, $2, $3, now() + ($4 || ' milliseconds')::interval)`,
      [sha256(token), adminId, purpose, String(TOKEN_TTL_MS[purpose])]
    );
  });
  return `${origin}/admin/password?token=${token}`;
}

async function findAdminByEmail(tenantSlug: string, email: string) {
  const res = await query<{ id: string; password_hash: string | null }>(
    `SELECT a.id, a.password_hash FROM admins a JOIN tenants t ON t.id = a.tenant_id
     WHERE t.slug = $1 AND a.email = $2`,
    [tenantSlug, normEmail(email)]
  );
  return res.rows[0] ?? null;
}

const passwordAuth: AuthProvider = {
  isConfigured: () => isPostgresConfigured(),

  async login(tenantSlug, email, password) {
    const row = await findAdminByEmail(tenantSlug, email);
    // Se verifica siempre (aunque no exista la cuenta) para no revelar qué correos existen
    const ok = await verifyPassword(password, row?.password_hash);
    if (!row || !ok) throw new AuthError(BAD_CREDENTIALS, 401);
    await query('UPDATE admins SET last_login_at = now() WHERE id = $1', [row.id]);
    const admin = await store().getAdmin(row.id);
    if (!admin) throw new AuthError(BAD_CREDENTIALS, 401);
    return admin;
  },

  async invite(account, origin) {
    if (await findAdminByEmail(account.tenantSlug, account.email)) {
      throw new AuthError('Ya existe un administrador con ese correo en esta barbería', 409);
    }
    const adminId = randomBytes(16).toString('hex');
    await store().createAdmin({ id: adminId, ...account, email: normEmail(account.email), invited: true });
    return { adminId, setupLink: await issueToken(adminId, 'setup', origin), expiresIn: TOKEN_TTL_LABEL.setup };
  },

  async createWithPassword(account, password) {
    if (await findAdminByEmail(account.tenantSlug, account.email)) {
      throw new AuthError('Ya existe un administrador con ese correo en esta barbería', 409);
    }
    const adminId = randomBytes(16).toString('hex');
    await store().createAdmin({ id: adminId, ...account, email: normEmail(account.email) });
    await query('UPDATE admins SET password_hash = $2 WHERE id = $1', [adminId, await hashPassword(password)]);
    return { adminId };
  },

  async resetLink(tenantSlug, email, origin) {
    const row = await findAdminByEmail(tenantSlug, email);
    if (!row) return null;
    const admin = await store().getAdmin(row.id);
    if (!admin) return null;
    // Sin contraseña todavía (invitación pendiente o admin migrado): enlace de creación
    const purpose = row.password_hash ? 'reset' : 'setup';
    return { admin, link: await issueToken(row.id, purpose, origin), purpose, expiresIn: TOKEN_TTL_LABEL[purpose] };
  },

  async deleteAccount(adminId) {
    await store().deleteAdmin(adminId); // los enlaces pendientes se borran en cascada
  },

  async renameAccount() {
    // El nombre vive solo en la tabla de admins
  },
};

export function auth(): AuthProvider {
  return dataBackend() === 'postgres' ? passwordAuth : firebaseAuth;
}

/**
 * Crea la contraseña con un enlace del correo. Un solo uso; vence según su tipo.
 * Devuelve el admin, o null si el enlace no es válido, ya se usó o venció.
 */
export async function setPasswordWithToken(token: string, newPasswordHash: string): Promise<AdminRecord | null> {
  if (typeof token !== 'string' || token.length < 20) return null;
  const adminId = await withTransaction(async (c) => {
    const res = await c.query<{ admin_id: string }>(
      `UPDATE password_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING admin_id`,
      [sha256(token)]
    );
    const id = res.rows[0]?.admin_id;
    if (!id) return null;
    await c.query('UPDATE admins SET password_hash = $2, invited = false, updated_at = now() WHERE id = $1', [
      id,
      newPasswordHash,
    ]);
    // Cualquier otro enlace pendiente de este admin deja de servir
    await c.query('DELETE FROM password_tokens WHERE admin_id = $1 AND used_at IS NULL', [id]);
    return id;
  });
  return adminId ? store().getAdmin(adminId) : null;
}

/**
 * Dirección pública de la barbería para los enlaces de los correos.
 *
 * Nunca se toma del encabezado Host en producción: un atacante podría pedir
 * "olvidé mi contraseña" con un Host falso y hacer que el correo legítimo lleve
 * un enlace a su dominio (y robar el token). Por eso:
 * - barbería por defecto → APP_URL
 * - otras barberías → https://{slug}.{NEXT_PUBLIC_APP_DOMAIN}
 * - en desarrollo (no producción) se permite el host local de la petición.
 */
export function appOrigin(request: Request, tenantSlug: string): string {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '');
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const isDefault = tenantSlug === (process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'demo');

  if (process.env.NODE_ENV === 'production') {
    if (isDefault && appUrl) return appUrl;
    if (!isDefault && domain) return `https://${tenantSlug}.${domain}`;
    throw new AuthError('Falta configurar APP_URL / NEXT_PUBLIC_APP_DOMAIN para generar enlaces', 500);
  }

  const host = request.headers.get('host') || 'localhost:3000';
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return local ? `http://${host}` : appUrl ?? 'http://localhost:3000';
}
