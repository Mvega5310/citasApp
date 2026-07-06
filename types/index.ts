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
  acceptsDataPolicy: boolean;
  acceptsNotifications: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

export interface WorkingHours {
  open: string;   // "09:00"
  close: string;  // "18:00"
  closed: boolean;
}

export interface TenantConfig {
  slug: string;
  name: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  address: string;
  phone: string;
  email: string;
  whatsapp?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  services: Service[];
  workingHours: Record<'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo', WorkingHours>;
  active: boolean;
}