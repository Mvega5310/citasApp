/**
 * Límite simple de intentos por clave (p. ej. barbería + correo, barbería + IP).
 * En memoria: basta para una sola instancia (Railway). Si algún día hay varias
 * instancias, cada una lleva su propia cuenta.
 */
type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var _rateLimit: Map<string, Bucket> | undefined;
}
globalThis._rateLimit ??= new Map();
const buckets = globalThis._rateLimit;

/** Cuántos segundos faltan si la clave superó el límite; 0 si puede continuar. */
export function retryAfter(key: string, limit: number): number {
  const b = buckets.get(key);
  if (!b || Date.now() > b.resetAt) return 0;
  return b.count >= limit ? Math.ceil((b.resetAt - Date.now()) / 1000) : 0;
}

export function hit(key: string, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else b.count++;
}

export function clear(key: string): void {
  buckets.delete(key);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'desconocida'
  );
}
