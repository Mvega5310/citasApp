import { getServiceById, workingSchedule } from '../shared/services';

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function isValidScheduleSlot(dateStr: string, time: string, duration: number): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  const rule = workingSchedule[d.getDay()];
  if (!rule || rule.closed) return false;
  const slotMin = toMin(time);
  const startMin = toMin(rule.start);
  const endMin = toMin(rule.end);
  if (slotMin < startMin || slotMin + duration > endMin) return false;
  if ((slotMin - startMin) % 30 !== 0) return false;
  return true;
}

export type NormalizedBookingPayload = {
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
  habeasDataAccepted: boolean;
  notificationsAccepted: boolean;
};

type ValidationResult =
  | { ok: true; data: NormalizedBookingPayload }
  | { ok: false; error: string };

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

const cleanText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function normalizeBookingPayload(payload: Partial<NormalizedBookingPayload>): NormalizedBookingPayload {
  return {
    serviceId: cleanText(payload.serviceId),
    serviceName: cleanText(payload.serviceName),
    clientName: cleanText(payload.clientName).replace(/\s+/g, ' '),
    clientEmail: cleanText(payload.clientEmail).toLowerCase(),
    clientWhatsApp: cleanText(payload.clientWhatsApp).replace(/[^\d+]/g, ''),
    date: cleanText(payload.date),
    time: cleanText(payload.time),
    habeasDataAccepted: payload.habeasDataAccepted === true,
    notificationsAccepted: payload.notificationsAccepted === true,
  };
}

export function validateBookingPayload(payload: Partial<NormalizedBookingPayload>): ValidationResult {
  const data = normalizeBookingPayload(payload);

  if (!data.serviceId || !data.serviceName || !data.clientName || !data.clientEmail || !data.clientWhatsApp || !data.date || !data.time) {
    return { ok: false, error: 'Todos los campos de la reserva son obligatorios.' };
  }

  if (!data.habeasDataAccepted) {
    return { ok: false, error: 'Debes aceptar la política de tratamiento de datos personales (Ley 1581 de 2012).' };
  }

  const service = getServiceById(data.serviceId);
  if (!service) {
    return { ok: false, error: 'El servicio seleccionado no existe.' };
  }

  if (data.serviceName !== service.name) {
    return { ok: false, error: 'El nombre del servicio no coincide con el catálogo actual.' };
  }

  if (data.clientName.length < 2) {
    return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
  }

  if (!EMAIL_REGEX.test(data.clientEmail)) {
    return { ok: false, error: 'Ingresa un correo electrónico válido.' };
  }

  if (!PHONE_REGEX.test(data.clientWhatsApp)) {
    return { ok: false, error: 'Ingresa un número de WhatsApp válido.' };
  }

  if (!DATE_REGEX.test(data.date) || Number.isNaN(Date.parse(`${data.date}T00:00:00`))) {
    return { ok: false, error: 'La fecha seleccionada no es válida.' };
  }

  if (!TIME_REGEX.test(data.time)) {
    return { ok: false, error: 'La hora seleccionada no es válida.' };
  }

  if (!isValidScheduleSlot(data.date, data.time, service.duration)) {
    return { ok: false, error: 'La hora elegida está fuera del horario de atención.' };
  }

  return { ok: true, data };
}
