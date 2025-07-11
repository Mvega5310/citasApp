export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  icon: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CalendarDay {
  date: string;
  day: number;
  month: number;
  year: number;
  available: boolean;
  appointments: number;
}

export interface BookingFormData {
  serviceId: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
} 