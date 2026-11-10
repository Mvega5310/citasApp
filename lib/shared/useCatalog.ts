'use client';

import { useEffect, useState } from 'react';
import type { PublicCatalog } from './services';

// Una sola petición por carga de página, compartida por todos los componentes.
let pending: Promise<PublicCatalog | null> | null = null;

// Componentes montados que quieren enterarse si el catálogo cambia. Sin esto,
// guardar servicios u horarios dejaba al panel mostrando la copia vieja hasta
// recargar la página entera: el sitio del cliente sí veía el cambio (cada
// visita es una carga nueva) y el panel no, lo que parecía que los cambios
// "solo funcionaban para clientes".
const suscriptores = new Set<(c: PublicCatalog | null) => void>();

function loadCatalog(): Promise<PublicCatalog | null> {
  pending ??= fetch('/api/catalog', { cache: 'no-store' })
    .then((res) => (res.ok ? (res.json() as Promise<PublicCatalog>) : null))
    .catch(() => null)
    .then((catalog) => {
      if (!catalog) pending = null; // permite reintentar si falló
      return catalog;
    });
  return pending;
}

/**
 * Vuelve a pedir el catálogo y avisa a todo lo que esté montado.
 *
 * Llámala después de guardar algo que el catálogo expone: servicios, horario
 * del local, nombre del negocio o barberos.
 */
export function invalidateCatalog(): Promise<PublicCatalog | null> {
  pending = null;
  const recarga = loadCatalog();
  recarga.then((c) => suscriptores.forEach((avisar) => avisar(c)));
  return recarga;
}

/** Catálogo (servicios + horario + nombre) de la barbería actual. `null` mientras carga o si falla. */
export function useCatalog(): { catalog: PublicCatalog | null; loading: boolean } {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const avisar = (c: PublicCatalog | null) => {
      if (active) setCatalog(c);
    };
    suscriptores.add(avisar);

    loadCatalog().then((c) => {
      if (!active) return;
      setCatalog(c);
      setLoading(false);
    });

    return () => {
      active = false;
      suscriptores.delete(avisar);
    };
  }, []);

  return { catalog, loading };
}
