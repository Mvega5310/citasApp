import { SignJWT, jwtVerify } from 'jose';

export type CancelTokenPayload = {
  kind?: 'single';
  appointmentId: string;
  tenantSlug: string;
  date: string;
  time: string;
  serviceName: string;
  clientName: string;
};

export type GroupCancelTokenPayload = {
  kind: 'group';
  groupId: string;
  tenantSlug: string;
  clientName: string;
};

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_SECRET ?? 'cancel-secret-fallback');
}

export async function generateCancelToken(payload: CancelTokenPayload): Promise<string> {
  return new SignJWT({ kind: 'single', ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function generateGroupCancelToken(payload: GroupCancelTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyCancelToken(
  token: string
): Promise<CancelTokenPayload | GroupCancelTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as CancelTokenPayload | GroupCancelTokenPayload;
  } catch {
    return null;
  }
}

// Colombia = UTC-5. Returns ms until appointment; negative means it's past.
export function msUntilAppointment(date: string, time: string): number {
  const appointment = new Date(`${date}T${time}:00-05:00`);
  return appointment.getTime() - Date.now();
}

export const CANCEL_WINDOW_MS = 30 * 60 * 1000;
