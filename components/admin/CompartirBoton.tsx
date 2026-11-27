'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import CompartirDialog from '@/components/shared/CompartirDialog';

/**
 * Acceso directo para compartir el sitio de la barbería, desde cualquier
 * página del panel. Antes había que entrar a Configuración y bajar hasta el
 * QR; ahora es un toque, aquí mismo.
 */
export default function CompartirBoton({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Compartir el sitio de la barbería"
        title="Compartir"
        className={className}
      >
        <Share2 className="w-5 h-5" />
      </button>
      {abierto && (
        <CompartirDialog
          titulo="Compartir tu barbería"
          mensaje="El código o el enlace llevan directo a reservar."
          fuente={{
            imagen: '/api/qr?pagina=inicio',
            descarga: '/api/qr?pagina=inicio&descargar=1',
            datos: '/api/qr?pagina=inicio&formato=json',
            archivo: 'qr-mi-barberia.png',
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
