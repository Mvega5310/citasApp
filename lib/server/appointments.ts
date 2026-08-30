import { adminDb, isFirebaseConfigured } from './firebaseAdmin';

export function appointmentsCol(db: FirebaseFirestore.Firestore, tenantSlug: string) {
  return tenantSlug
    ? db.collection('tenants').doc(tenantSlug).collection('appointments')
    : db.collection('appointments');
}

export async function isSlotBlocked(date: string, time: string, tenantSlug: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  try {
    const db = adminDb();
    const base = tenantSlug
      ? db.collection('tenants').doc(tenantSlug).collection('blocked_slots')
      : db.collection('blocked_slots');
    const snap = await base.doc(date).get();
    if (!snap.exists) return false;
    const slots: string[] = snap.data()?.slots ?? [];
    return slots.includes(time);
  } catch {
    return false;
  }
}

export async function isSlotTaken(date: string, time: string, tenantSlug: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  try {
    const db = adminDb();
    const snap = await appointmentsCol(db, tenantSlug)
      .where('date', '==', date)
      .where('time', '==', time)
      .get();
    return snap.docs.some((d) => ['pending', 'confirmed'].includes(d.data().status));
  } catch {
    return false;
  }
}
