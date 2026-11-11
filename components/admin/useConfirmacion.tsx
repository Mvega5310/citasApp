'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Confirmación dentro de la app, en lugar de `window.confirm`.
 *
 * El diálogo nativo se descarta solo en varios sitios donde esta app se usa de
 * verdad: la vista previa del editor, y los navegadores embebidos de Instagram
 * y Facebook —justo por donde una barbería reparte su enlace—. Cuando eso pasa
 * devuelve "cancelar" y el botón parece roto: no ocurre nada y nadie explica
 * por qué. Además no se puede estilizar, así que rompía la estética del panel.
 *
 * Uso:
 *   const { confirmar, dialogo } = useConfirmacion();
 *   if (!(await confirmar({ titulo: '¿Borrar?', mensaje: '…' }))) return;
 *   // y renderizar {dialogo} una vez en la página
 */
type Opciones = {
  titulo: string;
  mensaje?: string;
  /** Texto del botón que confirma. Por defecto "Confirmar". */
  aceptar?: string;
  /** Pinta la acción en rojo. Para lo que borra o no se puede deshacer. */
  peligro?: boolean;
};

type Estado = Opciones & { resolver: (v: boolean) => void };

export function useConfirmacion() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback(
    (opciones: Opciones) =>
      new Promise<boolean>((resolve) => setEstado({ ...opciones, resolver: resolve })),
    []
  );

  const cerrar = useCallback(
    (valor: boolean) => {
      setEstado((actual) => {
        actual?.resolver(valor);
        return null;
      });
    },
    []
  );

  // Escape cancela, como en cualquier diálogo
  useEffect(() => {
    if (!estado) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
    };
    document.addEventListener('keydown', alPulsar);
    botonRef.current?.focus();
    return () => document.removeEventListener('keydown', alPulsar);
  }, [estado, cerrar]);

  const dialogo = estado ? (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={() => cerrar(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-cafe-card border border-cafe-border rounded-2xl shadow-xl p-6"
      >
        <h2 id="confirmar-titulo" className="text-base font-semibold text-cafe-text">
          {estado.titulo}
        </h2>
        {estado.mensaje && (
          <p className="mt-2 text-sm text-cafe-muted leading-relaxed whitespace-pre-line">
            {estado.mensaje}
          </p>
        )}
        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => cerrar(false)}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold transition"
          >
            Cancelar
          </button>
          <button
            ref={botonRef}
            type="button"
            onClick={() => cerrar(true)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition ${
              estado.peligro
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-cafe-gold text-cafe-bg hover:bg-cafe-goldlight'
            }`}
          >
            {estado.aceptar ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmar, dialogo };
}
