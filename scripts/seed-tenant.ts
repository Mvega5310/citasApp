/**
 * Seed de tenant para el emulador de Firestore.
 * Uso: npm run seed:tenant
 * Requiere que el emulador esté corriendo (npm run emulators).
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { TenantConfig } from '../types';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

initializeApp({ projectId: 'turnos-de-belleza' });

const db = getFirestore();

const demoTenant: Omit<TenantConfig, 'slug'> = {
  name: 'Salón Demo',
  tagline: 'Tu belleza, nuestra pasión',
  logoUrl: '',
  primaryColor: '#6b7a5e',   // sage
  secondaryColor: '#c07a5a', // terracota
  accentColor: '#d4a853',    // gold
  address: 'Calle 123 # 45-67, Bogotá',
  phone: '+57 300 000 0000',
  email: 'demo@beautyturno.com',
  whatsapp: '+573000000000',
  instagramUrl: '',
  facebookUrl: '',
  active: true,
  services: [
    { id: 'manicure',     name: 'Manicure',         description: 'Manicure completo con esmaltado semipermanente', duration: 60, price: 25000, icon: '💅' },
    { id: 'pedicure',     name: 'Pedicure',          description: 'Pedicure completo con esmaltado semipermanente', duration: 75, price: 30000, icon: '🦶' },
    { id: 'blower',       name: 'Blower',            description: 'Secado y peinado profesional',                   duration: 45, price: 20000, icon: '💇‍♀️' },
    { id: 'corte-barba',  name: 'Corte y Barba',     description: 'Corte de cabello y barba completo',              duration: 45, price: 15000, icon: '🧔' },
    { id: 'cejas',        name: 'Cejas',             description: 'Diseño y depilación de cejas',                   duration: 10, price:  3000, icon: '👁️' },
  ],
  workingHours: {
    lunes:     { open: '09:00', close: '20:00', closed: false },
    martes:    { open: '09:00', close: '20:00', closed: false },
    miercoles: { open: '09:00', close: '20:00', closed: false },
    jueves:    { open: '09:00', close: '20:00', closed: false },
    viernes:   { open: '09:00', close: '20:00', closed: false },
    sabado:    { open: '09:00', close: '18:00', closed: false },
    domingo:   { open: '09:00', close: '16:00', closed: false },
  },
};

async function seed() {
  await db.collection('tenants').doc('demo').set(demoTenant);
  console.log('✅ Tenant "demo" creado en el emulador');

  // Cita de ejemplo para ver el dashboard
  await db
    .collection('tenants')
    .doc('demo')
    .collection('appointments')
    .doc('appt-seed-001')
    .set({
      serviceId: 'manicure',
      serviceName: 'Manicure',
      clientName: 'Ana García',
      clientEmail: 'ana@example.com',
      clientWhatsApp: '+573001234567',
      date: '2026-05-10',
      time: '10:00',
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  console.log('✅ Cita de ejemplo creada');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
