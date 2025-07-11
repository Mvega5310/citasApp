import { Service } from '@/types';

export const services: Service[] = [
  {
    id: 'manicure',
    name: 'Manicure',
    description: 'Manicure completo con esmaltado semipermanente',
    duration: 60,
    price: 25000,
    icon: '💅'
  },
  {
    id: 'pedicure',
    name: 'Pedicure',
    description: 'Pedicure completo con esmaltado semipermanente',
    duration: 75,
    price: 30000,
    icon: '🦶'
  },
  {
    id: 'blower',
    name: 'Blower',
    description: 'Secado y peinado profesional',
    duration: 45,
    price: 20000,
    icon: '💇‍♀️'
  },
  {
    id: 'corte-cabello',
    name: 'Corte de Cabello',
    description: 'Corte de cabello profesional para hombres',
    duration: 30,
    price: 12000,
    icon: '✂️'
  },
  {
    id: 'corte-barba',
    name: 'Corte y Barba',
    description: 'Corte de cabello y barba completo',
    duration: 45,
    price: 15000,
    icon: '🧔'
  },
  {
    id: 'cejas',
    name: 'Cejas',
    description: 'Diseño y depilación de cejas',
    duration: 20,
    price: 3000,
    icon: '👁️'
  },
  {
    id: 'solo-barba',
    name: 'Solo Barba',
    description: 'Arreglo y diseño de barba',
    duration: 25,
    price: 3000,
    icon: '🪒'
  }
];

export const getServiceById = (id: string): Service | undefined => {
  return services.find(service => service.id === id);
};

export const getServicePrice = (id: string): number => {
  const service = getServiceById(id);
  return service?.price || 0;
};

export const getServiceDuration = (id: string): number => {
  const service = getServiceById(id);
  return service?.duration || 0;
};

// Horarios disponibles
export const availableHours = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30'
];

// Horario de trabajo
export const workingHours = {
  start: '09:00',
  end: '20:00',
  daysOff: [0, 6] // 0 = domingo, 6 = sábado
}; 