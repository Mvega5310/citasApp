import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { marcaDeLaPagina } from '@/lib/server/marca';

/**
 * El panel lleva el nombre de su barbería, y no el título del cliente: en la
 * pestaña, "Reserva tu cita" no tiene sentido para quien está administrando.
 * Importa sobre todo con varias barberías abiertas a la vez, que es el caso de
 * quien opera la plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { nombre } = await marcaDeLaPagina();
  return {
    title: `${nombre} · Panel`,
    manifest: '/admin-manifest.json',
    // El panel es privado: no se comparte ni se indexa.
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
