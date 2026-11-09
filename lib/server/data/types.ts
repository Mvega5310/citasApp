import type { TenantConfig } from '@/types';
import type { EditableCatalog } from '../catalog';
import type { SalonSettings } from '../settings';

/**
 * Contrato de acceso a datos. Todas las operaciones de negocio reciben el slug
 * de la barbería: ninguna puede leer ni escribir datos de otra.
 * Hay dos implementaciones (Firestore y Postgres) con el mismo comportamiento.
 */

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed'];

export type AppointmentRecord = {
  id: string;
  tenantSlug: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string; // YYYY-MM-DD (hora local del negocio)
  time: string; // HH:MM
  status: AppointmentStatus;
  groupId?: string | null;
  habeasDataAccepted?: boolean;
  notificationsAccepted?: boolean;
  reminderSent?: boolean;
  reminderSentAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  lateCancel?: boolean | null;
  source?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type NewAppointment = {
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
  habeasDataAccepted: boolean;
  notificationsAccepted: boolean;
  groupId?: string;
};

export type AppointmentPatch = Partial<
  Pick<AppointmentRecord, 'status' | 'cancelledAt' | 'cancelledBy' | 'lateCancel' | 'reminderSentAt'>
>;

export type AdminRecord = {
  id: string;
  tenantSlug: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  invited?: boolean;
  createdBy?: string | null;
  createdAt: string | null;
  /**
   * Cuándo cambió la contraseña por última vez. Las sesiones emitidas antes de
   * ese momento dejan de servir (ver authorizeAdmin). null = nunca la ha
   * cambiado, que no invalida ninguna sesión.
   */
  passwordChangedAt?: string | null;
};

export type TenantLookupResult = { found: true; config: TenantConfig } | { found: false };

/** Una cita ocupa un horario que ya estaba tomado (lo detecta la base al guardar). */
export class SlotTakenError extends Error {
  constructor(public readonly date?: string, public readonly time?: string) {
    super('El horario ya está reservado');
    this.name = 'SlotTakenError';
  }
}

export interface DataStore {
  readonly backend: 'firestore' | 'postgres';

  // ── Barberías ──
  /** Lanza error si la base no responde (distinto de "no existe"). */
  lookupTenant(slug: string): Promise<TenantLookupResult>;
  saveCatalog(slug: string, catalog: EditableCatalog, updatedBy: string): Promise<void>;

  // ── Configuración ──
  readSettings(slug: string): Promise<Partial<SalonSettings> | null>;
  writeSettings(slug: string, settings: SalonSettings): Promise<void>;

  // ── Citas ──
  /** Todas las citas de la barbería, más recientes primero. */
  listAppointments(slug: string): Promise<AppointmentRecord[]>;
  appointmentsOnDate(slug: string, date: string): Promise<AppointmentRecord[]>;
  appointmentsInGroup(slug: string, groupId: string): Promise<AppointmentRecord[]>;
  getAppointment(slug: string, id: string): Promise<AppointmentRecord | null>;
  /** Guarda todas o ninguna. Lanza SlotTakenError si un horario ya estaba ocupado. */
  createAppointments(slug: string, items: NewAppointment[]): Promise<string[]>;
  /** false si la cita no existe en esta barbería. */
  updateAppointment(slug: string, id: string, patch: AppointmentPatch): Promise<boolean>;
  deleteAppointment(slug: string, id: string): Promise<boolean>;
  /** Citas activas sin recordatorio en esas fechas, de todas las barberías. */
  reminderCandidates(dates: string[]): Promise<AppointmentRecord[]>;

  // ── Horarios bloqueados ──
  blockedSlots(slug: string, date: string): Promise<string[]>;
  /** Devuelve la lista final de horarios bloqueados del día. */
  updateBlockedSlots(slug: string, date: string, slots: string[], action: 'block' | 'unblock'): Promise<string[]>;

  // ── Administradores ──
  getAdmin(id: string): Promise<AdminRecord | null>;
  listAdmins(slug: string): Promise<AdminRecord[]>;
  createAdmin(admin: Omit<AdminRecord, 'createdAt'>): Promise<void>;
  updateAdmin(id: string, patch: { name?: string; role?: 'admin' | 'viewer' }): Promise<void>;
  deleteAdmin(id: string): Promise<void>;
  hasAdmins(slug: string): Promise<boolean>;
}
