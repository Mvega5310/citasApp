import admin from 'firebase-admin';
import type { TenantConfig } from '@/types';
import { adminDb } from '../firebaseAdmin';
import { DEFAULT_TENANT_SLUG, adminTenantOf } from '../tenantDefaults';
import type { EditableCatalog } from '../catalog';
import type { SalonSettings } from '../settings';
import {
  ACTIVE_STATUSES,
  type AdminRecord,
  type AppointmentPatch,
  type AppointmentRecord,
  type DataStore,
  type NewAppointment,
} from './types';

type Db = FirebaseFirestore.Firestore;
type Snap = FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot;

// Slug vacío = colección antigua (citas anteriores al multi-tenant, enlaces viejos)
const appointmentsCol = (db: Db, slug: string) =>
  slug ? db.collection('tenants').doc(slug).collection('appointments') : db.collection('appointments');

/**
 * Documento de una cita de la barbería. La barbería por defecto también es dueña
 * de la colección antigua (citas anteriores al multi-tenant).
 */
async function findAppointment(db: Db, slug: string, id: string) {
  const ref = appointmentsCol(db, slug).doc(id);
  const snap = await ref.get();
  if (snap.exists || slug !== DEFAULT_TENANT_SLUG) return { ref, snap };
  const legacyRef = appointmentsCol(db, '').doc(id);
  return { ref: legacyRef, snap: await legacyRef.get() };
}

const blockedDoc = (db: Db, slug: string, date: string) =>
  (slug ? db.collection('tenants').doc(slug).collection('blocked_slots') : db.collection('blocked_slots')).doc(date);

const settingsDoc = (db: Db, slug: string) => db.collection('tenants').doc(slug).collection('settings').doc('salon');

function toAppointment(doc: Snap, slug: string): AppointmentRecord {
  const d = doc.data() ?? {};
  return { ...(d as AppointmentRecord), id: doc.id, tenantSlug: (d.tenantSlug as string) || slug || DEFAULT_TENANT_SLUG };
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === 'function' ? maybe.toDate().toISOString() : null;
}

function toAdmin(doc: Snap): AdminRecord {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    tenantSlug: adminTenantOf(d),
    email: d.email ?? '',
    name: d.name ?? '',
    role: d.role === 'admin' ? 'admin' : 'viewer',
    invited: d.invited === true,
    createdBy: d.createdBy ?? null,
    createdAt: toIso(d.createdAt),
  };
}

const isActive = (a: AppointmentRecord) => ACTIVE_STATUSES.includes(a.status);

export const firestoreStore: DataStore = {
  backend: 'firestore',

  async lookupTenant(slug) {
    const snap = await adminDb().collection('tenants').doc(slug).get();
    return snap.exists ? { found: true, config: { slug, ...snap.data() } as TenantConfig } : { found: false };
  },

  async saveCatalog(slug, catalog: EditableCatalog, updatedBy) {
    await adminDb()
      .collection('tenants')
      .doc(slug)
      .set(
        {
          services: catalog.services,
          workingHours: catalog.workingHours,
          catalogUpdatedAt: new Date().toISOString(),
          catalogUpdatedBy: updatedBy,
        },
        { merge: true }
      );
  },

  async readSettings(slug) {
    const db = adminDb();
    const doc = await settingsDoc(db, slug).get();
    if (doc.exists) return doc.data() as Partial<SalonSettings>;
    // Documento global anterior: solo pertenece a la barbería por defecto
    if (slug === DEFAULT_TENANT_SLUG) {
      const legacy = await db.collection('settings').doc('salon').get();
      if (legacy.exists) return legacy.data() as Partial<SalonSettings>;
    }
    return null;
  },

  async writeSettings(slug, settings) {
    await settingsDoc(adminDb(), slug).set(settings, { merge: true });
  },

  async listAppointments(slug) {
    const snap = await appointmentsCol(adminDb(), slug).get();
    return snap.docs
      .map((doc) => toAppointment(doc, slug))
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  },

  async appointmentsOnDate(slug, date) {
    const snap = await appointmentsCol(adminDb(), slug).where('date', '==', date).get();
    return snap.docs.map((doc) => toAppointment(doc, slug));
  },

  async appointmentsInGroup(slug, groupId) {
    const snap = await appointmentsCol(adminDb(), slug).where('groupId', '==', groupId).get();
    return snap.docs.map((doc) => toAppointment(doc, slug));
  },

  async getAppointment(slug, id) {
    const { snap } = await findAppointment(adminDb(), slug, id);
    return snap.exists ? toAppointment(snap, slug) : null;
  },

  async createAppointments(slug, items: NewAppointment[]) {
    const db = adminDb();
    const col = appointmentsCol(db, slug);
    const now = new Date().toISOString();
    const batch = db.batch(); // todas o ninguna
    const ids: string[] = [];
    for (const { groupId, ...item } of items) {
      const ref = col.doc();
      batch.set(ref, {
        ...item,
        ...(groupId ? { groupId } : {}), // Firestore no acepta campos undefined
        tenantSlug: slug,
        status: 'pending',
        source: 'firebase',
        createdAt: now,
        updatedAt: now,
      });
      ids.push(ref.id);
    }
    await batch.commit();
    return ids;
  },

  async updateAppointment(slug, id, patch: AppointmentPatch) {
    const { ref, snap } = await findAppointment(adminDb(), slug, id);
    if (!snap.exists) return false;
    const update: Record<string, unknown> = { ...patch, updatedAt: new Date().toISOString() };
    if (patch.reminderSentAt) update.reminderSent = true;
    await ref.update(update);
    return true;
  },

  async deleteAppointment(slug, id) {
    const { ref, snap } = await findAppointment(adminDb(), slug, id);
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  },

  async reminderCandidates(dates) {
    const db = adminDb();
    // listDocuments incluye barberías sin documento propio pero con citas (p. ej. la por defecto)
    const slugs = new Set((await db.collection('tenants').listDocuments()).map((r) => r.id));
    slugs.add(DEFAULT_TENANT_SLUG);
    const sources = [...Array.from(slugs), ''];
    const found: AppointmentRecord[] = [];
    for (const slug of sources) {
      for (const date of dates) {
        try {
          const snap = await appointmentsCol(db, slug).where('date', '==', date).get();
          for (const doc of snap.docs) {
            const appt = toAppointment(doc, slug);
            if (isActive(appt) && !appt.reminderSent) found.push({ ...appt, tenantSlug: slug || DEFAULT_TENANT_SLUG });
          }
        } catch {
          // Un error en una barbería no frena los recordatorios de las demás
        }
      }
    }
    return found;
  },

  async blockedSlots(slug, date) {
    const snap = await blockedDoc(adminDb(), slug, date).get();
    return snap.exists ? ((snap.data()?.slots as string[]) ?? []) : [];
  },

  async updateBlockedSlots(slug, date, slots, action) {
    const ref = blockedDoc(adminDb(), slug, date);
    const snap = await ref.get();
    const current: string[] = snap.exists ? (snap.data()?.slots ?? []) : [];
    const updated =
      action === 'block'
        ? Array.from(new Set([...current, ...slots])).sort()
        : current.filter((s) => !slots.includes(s));
    if (updated.length === 0) {
      if (snap.exists) await ref.delete();
    } else {
      await ref.set({ slots: updated, updatedAt: new Date().toISOString() });
    }
    return updated;
  },

  async getAdmin(id) {
    const snap = await adminDb().collection('admins').doc(id).get();
    return snap.exists ? toAdmin(snap) : null;
  },

  async listAdmins(slug) {
    const snap = await adminDb().collection('admins').orderBy('createdAt', 'asc').get();
    return snap.docs.map(toAdmin).filter((a) => a.tenantSlug === slug);
  },

  async createAdmin(a) {
    await adminDb()
      .collection('admins')
      .doc(a.id)
      .set({
        email: a.email,
        name: a.name,
        role: a.role,
        tenantSlug: a.tenantSlug,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(a.createdBy ? { createdBy: a.createdBy } : {}),
        ...(a.invited ? { invited: true } : {}),
      });
  },

  async updateAdmin(id, patch) {
    await adminDb().collection('admins').doc(id).set(patch, { merge: true });
  },

  async deleteAdmin(id) {
    await adminDb().collection('admins').doc(id).delete();
  },

  async hasAdmins(slug) {
    const snap = await adminDb().collection('admins').get();
    return snap.docs.some((doc) => adminTenantOf(doc.data()) === slug);
  },
};
