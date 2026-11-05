import type { DataStore } from './types';

// Se implementa en el paso 2b. Mientras tanto, DATA_BACKEND=postgres no está disponible.
const notYet = (): never => {
  throw new Error('DATA_BACKEND=postgres todavía no está disponible');
};

export const postgresStore: DataStore = {
  backend: 'postgres',
  lookupTenant: notYet,
  saveCatalog: notYet,
  readSettings: notYet,
  writeSettings: notYet,
  listAppointments: notYet,
  appointmentsOnDate: notYet,
  appointmentsInGroup: notYet,
  getAppointment: notYet,
  createAppointments: notYet,
  updateAppointment: notYet,
  deleteAppointment: notYet,
  reminderCandidates: notYet,
  blockedSlots: notYet,
  updateBlockedSlots: notYet,
  getAdmin: notYet,
  listAdmins: notYet,
  createAdmin: notYet,
  updateAdmin: notYet,
  deleteAdmin: notYet,
  hasAdmins: notYet,
};
