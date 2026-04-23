import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
};

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('ADMIN_SECRET no configurado');
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(request: NextRequest | Request): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
  const token = match?.[1];
  if (!token) return null;
  return verifySession(token);
}
