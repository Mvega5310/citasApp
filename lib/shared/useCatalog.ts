'use client';

import { useEffect, useState } from 'react';
import type { Catalog } from './services';

// Una sola petición por carga de página, compartida por todos los componentes.
let pending: Promise<Catalog | null> | null = null;

function loadCatalog(): Promise<Catalog | null> {
  pending ??= fetch('/api/catalog', { cache: 'no-store' })
    .then((res) => (res.ok ? (res.json() as Promise<Catalog>) : null))
    .catch(() => null)
    .then((catalog) => {
      if (!catalog) pending = null; // permite reintentar si falló
      return catalog;
    });
  return pending;
}

/** Catálogo (servicios + horario) de la barbería actual. `null` mientras carga o si falla. */
export function useCatalog(): { catalog: Catalog | null; loading: boolean } {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadCatalog().then((c) => {
      if (!active) return;
      setCatalog(c);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { catalog, loading };
}
