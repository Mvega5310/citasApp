import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// scrypt (incluido en Node): resistente a ataques por fuerza bruta con hardware
const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)))
  );

const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Mensaje de error si la contraseña no cumple las reglas; null si es válida. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'La contraseña es obligatoria';
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  if (password.length > PASSWORD_MAX) return 'La contraseña es demasiado larga';
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return 'La contraseña debe combinar letras y números';
  return null;
}

/** Formato guardado: scrypt$N$r$p$sal$hash (base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

// Hash de relleno: se compara igual aunque el usuario no exista, para no revelar
// por el tiempo de respuesta qué correos tienen cuenta.
let dummyHash: Promise<string> | null = null;

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const target = stored ?? (await (dummyHash ??= hashPassword(randomBytes(16).toString('hex'))));
  const [scheme, n, r, p, saltB64, keyB64] = target.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return stored != null && actual.length === expected.length && timingSafeEqual(actual, expected);
}
