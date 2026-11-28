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
  /** Barbero asignado. null en las citas anteriores a que existieran. */
  barberId?: string | null;
  /**
   * Precio cobrado, congelado al reservar. null en las citas anteriores a que
   * se guardara: cruzarlas con el catálogo de hoy daría una cifra inventada.
   */
  price?: number | null;
  /**
   * El precio no se capturó al reservar: se reconstruyó después con el
   * catálogo del momento (migración 010). Distingue lo medido de lo deducido.
   */
  priceEstimated?: boolean;
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
  /** null o ausente = sin barbero (barbería que no los usa). */
  barberId?: string | null;
  /** Precio del servicio en el momento de reservar. */
  price?: number | null;
};

export type ManualAppointment = {
  serviceId: string;
  serviceName: string;
  /** Si no se escribe nada, queda "Cliente sin reserva". */
  clientName: string;
  date: string;
  time: string;
  barberId?: string | null;
  price: number;
};

export type BlockedClient = {
  email: string;
  reason: string;
  blockedAt: string | null;
  blockedBy: string | null;
};

export type AppointmentQuery = {
  status?: AppointmentRecord['status'];
  /** Un día concreto, en formato YYYY-MM-DD. */
  date?: string;
  /** Limita a un barbero: cuentas vinculadas solo ven lo suyo. */
  barberId?: string;
  limit: number;
  offset: number;
};

export type AppointmentPage = {
  rows: AppointmentRecord[];
  /** Cuántas cumplen el filtro, para saber cuántas páginas hay. */
  total: number;
  /**
   * Conteo por estado **sin aplicar los filtros**: las tarjetas de arriba
   * resumen la barbería entera, no la página que se está viendo.
   */
  resumen: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
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
  /**
   * Puede crear barberías nuevas. Es una capacidad de plataforma, aparte del
   * rol: quien la tiene sigue siendo admin o viewer de SU barbería, y no
   * obtiene acceso a los datos de las demás.
   */
  platformAdmin?: boolean;
  /**
   * Barbero al que pertenece esta cuenta. Si está puesto, el panel y el cierre
   * se filtran a sus citas: entre colegas que solo comparten local, la agenda
   * del otro no es asunto suyo.
   */
  barberId?: string | null;
};

export type TenantLookupResult = { found: true; config: TenantConfig } | { found: false };

/** Un barbero del equipo. El horario es del local, no de cada barbero. */
export type BarberRecord = {
  id: string;
  name: string;
  active: boolean;
  /**
   * Porcentaje de lo que produce que le corresponde (0-100). 0 = a sueldo.
   * Solo cuenta con modalidad 'comision'.
   *
   * Nunca sale al cliente: el catálogo público solo expone id y nombre.
   */
  commission: number;
  /**
   * Cómo se reparte lo que produce:
   *  - 'comision': es del local, que le paga `commission`%
   *  - 'puesto':   es suyo, y le paga al local `tarifaDiaria` por día trabajado
   */
  modalidad: 'comision' | 'puesto';
  /** Pesos por día trabajado. Solo cuenta con modalidad 'puesto'. */
  tarifaDiaria: number;
};

/** Una barbería vista desde el panel de plataforma. */
export type TenantSummary = {
  slug: string;
  name: string;
  status: string;
  admins: number;
  /** Citas registradas. Con alguna, la barbería ya no se puede borrar. */
  appointments: number;
  createdAt: string | null;
  /**
   * Plan acordado. El **estado** (en prueba, al día, vencida) no se guarda:
   * se deduce de estos datos en `lib/server/suscripcion.ts`.
   */
  plan: { hasta: string | null; precio: number; nota: string };
};

/** La barbería tiene citas: borrarla perdería el historial de clientes reales. */
export class TenantHasDataError extends Error {
  constructor(public readonly slug: string, public readonly appointments: number) {
    super(
      `"${slug}" tiene ${appointments} cita${appointments === 1 ? '' : 's'} registrada${appointments === 1 ? '' : 's'}. ` +
        'Suspéndela en vez de borrarla: deja de atender clientes pero conserva su historial.'
    );
    this.name = 'TenantHasDataError';
  }
}

/** El slug ya está tomado por otra barbería. */
export class TenantExistsError extends Error {
  constructor(public readonly slug: string) {
    super(`Ya existe una barbería con la dirección "${slug}"`);
    this.name = 'TenantExistsError';
  }
}

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
  /** Todas las barberías, para el panel de plataforma. */
  listTenants(): Promise<TenantSummary[]>;
  /** Cambia el plan acordado con una barbería. No cobra ni corta nada. */
  updateTenantPlan(
    slug: string,
    plan: { hasta: string | null; precio: number; nota: string }
  ): Promise<boolean>;
  /** Crea la barbería. Lanza TenantExistsError si el slug ya está tomado. */
  createTenant(input: { slug: string; name: string }): Promise<void>;
  /** Activa o suspende. Suspendida, el resolutor devuelve 403 a sus visitantes. */
  setTenantStatus(slug: string, status: 'active' | 'suspended'): Promise<void>;
  /** Borra la barbería y todo lo suyo. Lanza TenantHasDataError si tiene citas. */
  deleteTenant(slug: string): Promise<void>;
  saveCatalog(slug: string, catalog: EditableCatalog, updatedBy: string): Promise<void>;

  // ── Configuración ──
  readSettings(slug: string): Promise<Partial<SalonSettings> | null>;
  writeSettings(slug: string, settings: SalonSettings): Promise<void>;

  // ── Logo ──
  /**
   * Logo propio de la barbería, o null si no ha subido ninguno.
   *
   * Aparte de `readSettings` porque la configuración se lee en cada página y
   * no tiene por qué arrastrar la imagen donde no se pinta.
   */
  readLogo(slug: string): Promise<{ png: Buffer; updatedAt: string } | null>;
  writeLogo(slug: string, png: Buffer): Promise<void>;
  deleteLogo(slug: string): Promise<void>;

  // ── QR de cobro ──
  /**
   * Para pagos informales (Nequi/Daviplata) sin pasarela: la app solo guarda
   * la imagen, nunca procesa ni ve el pago real. El del negocio es el
   * respaldo cuando un barbero no subió el suyo.
   */
  readPaymentQr(slug: string): Promise<Buffer | null>;
  writePaymentQr(slug: string, png: Buffer): Promise<void>;
  deletePaymentQr(slug: string): Promise<void>;

  readBarberPaymentQr(slug: string, barberId: string): Promise<Buffer | null>;
  writeBarberPaymentQr(slug: string, barberId: string, png: Buffer): Promise<void>;
  deleteBarberPaymentQr(slug: string, barberId: string): Promise<void>;

  // ── Citas ──
  /** Todas las citas de la barbería, más recientes primero. */
  listAppointments(slug: string): Promise<AppointmentRecord[]>;
  /**
   * Una página del listado del panel, ya filtrada en la base.
   *
   * El panel traía las citas completas en cada carga —528 filas en la barbería
   * con más histórico— para filtrar y paginar en el navegador. Crece sin
   * techo: cuantas más citas acumula un local, más lento abre su panel.
   */
  listAppointmentsPage(slug: string, opciones: AppointmentQuery): Promise<AppointmentPage>;
  appointmentsOnDate(slug: string, date: string): Promise<AppointmentRecord[]>;
  appointmentsInGroup(slug: string, groupId: string): Promise<AppointmentRecord[]>;
  getAppointment(slug: string, id: string): Promise<AppointmentRecord | null>;
  /** Guarda todas o ninguna. Lanza SlotTakenError si un horario ya estaba ocupado. */
  createAppointments(slug: string, items: NewAppointment[]): Promise<string[]>;
  /**
   * Un corte que no pasó por la reserva: no llegó quien apartó y el barbero
   * atendió a otra persona, o le alcanzó el tiempo para uno más. Entra directo
   * como completada -no reserva un horario, ya sucedió- y marcada con
   * `source: 'manual'` para distinguirla en el Cierre de las que sí vinieron
   * por la web.
   */
  createManualAppointment(slug: string, item: ManualAppointment): Promise<AppointmentRecord>;
  /** false si la cita no existe en esta barbería. */
  updateAppointment(slug: string, id: string, patch: AppointmentPatch): Promise<boolean>;
  deleteAppointment(slug: string, id: string): Promise<boolean>;

  // ── Clientes bloqueados ──
  listBlockedClients(slug: string): Promise<BlockedClient[]>;
  blockClient(slug: string, email: string, reason: string, blockedBy: string): Promise<void>;
  unblockClient(slug: string, email: string): Promise<void>;
  /** Para el momento de reservar: ¿este correo ya no puede agendar solo? */
  isClientBlocked(slug: string, email: string): Promise<boolean>;
  /** Citas activas sin recordatorio en esas fechas, de todas las barberías. */
  reminderCandidates(dates: string[]): Promise<AppointmentRecord[]>;
  /**
   * Nombre y correo de la última reserva con ese WhatsApp en esta barbería,
   * para autocompletar a un cliente recurrente. null si nunca reservó aquí.
   */
  findRecentClientByWhatsApp(slug: string, whatsapp: string): Promise<{ clientName: string; clientEmail: string } | null>;

  // ── Horarios bloqueados ──
  blockedSlots(slug: string, date: string): Promise<string[]>;
  /** Devuelve la lista final de horarios bloqueados del día. */
  updateBlockedSlots(slug: string, date: string, slots: string[], action: 'block' | 'unblock'): Promise<string[]>;

  // ── Barberos ──
  /** Barberos de la barbería, en orden. */
  listBarbers(slug: string): Promise<BarberRecord[]>;
  /** Reemplaza el equipo completo. Lanza error si se intenta quitar a alguien con citas. */
  saveBarbers(slug: string, barbers: BarberRecord[]): Promise<void>;

  // ── Administradores ──
  getAdmin(id: string): Promise<AdminRecord | null>;
  listAdmins(slug: string): Promise<AdminRecord[]>;
  createAdmin(admin: Omit<AdminRecord, 'createdAt'>): Promise<void>;
  updateAdmin(
    id: string,
    patch: { name?: string; role?: 'admin' | 'viewer'; barberId?: string | null }
  ): Promise<void>;
  deleteAdmin(id: string): Promise<void>;
  hasAdmins(slug: string): Promise<boolean>;
}
