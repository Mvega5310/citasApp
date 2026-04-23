import type { Service } from '../../types/index';

type ServiceEntry = Service & { active?: boolean };

const allServices: ServiceEntry[] = [
  {
    id: 'manicure',
    name: 'Manicure',
    description: 'Manicure completo con esmaltado semipermanente',
    duration: 60,
    price: 25000,
    icon: '💅',
    active: false,
  },
  {
    id: 'pedicure',
    name: 'Pedicure',
    description: 'Pedicure completo con esmaltado semipermanente',
    duration: 75,
    price: 30000,
    icon: '🦶',
    active: false,
  },
  {
    id: 'blower',
    name: 'Blower',
    description: 'Secado y peinado profesional',
    duration: 45,
    price: 20000,
    icon: '💇‍♀️',
    active: false,
  },
  {
    id: 'corte-cabello',
    name: 'Corte de Cabello',
    description: 'Corte de cabello profesional para hombres',
    duration: 30,
    price: 12000,
    icon: '✂️',
  },
  {
    id: 'corte-barba',
    name: 'Corte y Barba',
    description: 'Corte de cabello y barba completo',
    duration: 45,
    price: 15000,
    icon: '🧔',
  },
  {
    id: 'cejas',
    name: 'Cejas',
    description: 'Diseño y depilación de cejas',
    duration: 10,
    price: 3000,
    icon: '👁️',
  },
  {
    id: 'solo-barba',
    name: 'Solo Barba',
    description: 'Arreglo y diseño de barba',
    duration: 25,
    price: 3000,
    icon: '🪒',
  },
];

export const services: Service[] = allServices.filter((s) => s.active !== false);

export const getServiceById = (id: string): Service | undefined => {
  return services.find((service) => service.id === id);
};

export const getServicePrice = (id: string): number => {
  const service = getServiceById(id);
  return service?.price || 0;
};

export const getServiceDuration = (id: string): number => {
  const service = getServiceById(id);
  return service?.duration || 0;
};

// Horarios por día de la semana (0=Domingo...6=Sábado)
export const workingSchedule: Record<number, { start: string; end: string; closed?: boolean }> = {
  0: { start: '09:00', end: '16:00' },
  1: { start: '09:00', end: '20:00' },
  2: { start: '09:00', end: '20:00' },
  3: { start: '09:00', end: '20:00' },
  4: { start: '09:00', end: '20:00' },
  5: { start: '09:00', end: '20:00' },
  6: { start: '09:00', end: '18:00' },
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const getAvailableHoursForDate = (dateStr: string, serviceDuration = 30): string[] => {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const rule = workingSchedule[date.getDay()];
  if (!rule || rule.closed) return [];

  const start = toMinutes(rule.start);
  const end = toMinutes(rule.end);
  const slots: string[] = [];
  const now = new Date();
  const isSameLocalDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  for (let t = start; t <= end - serviceDuration; t += 30) {
    if (isSameLocalDay) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (t <= currentMinutes) continue;
    }
    slots.push(toHHMM(t));
  }

  return slots;
};

export const isOpenDay = (date: Date): boolean => {
  const rule = workingSchedule[date.getDay()];
  return !!(rule && !rule.closed);
};
