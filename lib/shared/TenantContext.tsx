'use client';

import { createContext, useContext } from 'react';
import type { TenantConfig } from '@/types';

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig | null;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig | null {
  return useContext(TenantContext);
}

// Devuelve el nombre del tenant o el nombre por defecto de la app
export function useTenantName(): string {
  const tenant = useContext(TenantContext);
  return tenant?.name ?? process.env.NEXT_PUBLIC_APP_NAME ?? 'BeautyTurno';
}
