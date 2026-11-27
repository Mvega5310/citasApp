'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import CompartirDialog from '@/components/shared/CompartirDialog';

/**
 * Para que el cliente también pueda compartir la barbería, no solo quien
 * administra. Usa `/api/qr/publico`: sin sesión, siempre la página de inicio
 * de esta misma barbería.
 */
export default function CompartirBoton({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Compartir esta barbería"
        title="Compartir"
        className={className}
      >
        <Share2 className="w-4 h-4" />
      </button>
      {abierto && (
        <CompartirDialog
          titulo="Comparte esta barbería"
          mensaje="El código o el enlace llevan directo a reservar."
          fuente={{
            imagen: '/api/qr/publico',
            descarga: '/api/qr/publico?descargar=1',
            datos: '/api/qr/publico?formato=json',
            archivo: 'qr-barberia.png',
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
