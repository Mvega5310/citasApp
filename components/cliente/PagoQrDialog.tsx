'use client';

import { X, Download } from 'lucide-react';

/**
 * Solo la imagen del QR de cobro, sin "copiar enlace" ni compartir nativo:
 * no hay un destino de texto que tenga sentido copiar, es una foto para
 * escanear desde la app del banco. Separado de CompartirDialog por eso.
 */
export default function PagoQrDialog({
  base,
  salonName,
  onCerrar,
}: {
  base: string;
  salonName: string;
  onCerrar: () => void;
}) {
  const descarga = `${base}${base.includes('?') ? '&' : '?'}descargar=1`;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onCerrar}>
      <div
        className="bg-cafe-card rounded-2xl shadow-xl w-full max-w-sm p-6 border border-cafe-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-display font-medium text-cafe-text">Pagar por transferencia</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-cafe-subtle hover:text-cafe-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-cafe-subtle mb-5 leading-relaxed">
          Escanéalo desde tu app bancaria para pagarle directo a {salonName || 'esta barbería'}.
        </p>

        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-3 w-48 h-48 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={base}
              alt={`Código QR de cobro de ${salonName || 'la barbería'}`}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-xs text-cafe-subtle mt-3 text-center">Mantén presionado el código para guardarlo</p>

          <a
            href={descarga}
            download="qr-pago.png"
            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border border-cafe-border bg-cafe-soft text-cafe-text hover:border-cafe-gold transition mt-4"
          >
            <Download className="w-4 h-4" />
            Descargar
          </a>
        </div>
      </div>
    </div>
  );
}
