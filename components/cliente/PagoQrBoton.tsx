'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import PagoQrDialog from './PagoQrDialog';

/**
 * Botón de "pagar por transferencia", visible solo si la barbería (o el
 * barbero elegido) configuró un QR de cobro. Se detecta igual que
 * PagoQrUploader en el panel: un <img> oculto cuyo onLoad/onError dice si
 * existe, sin pedir un fetch aparte.
 */
export default function PagoQrBoton({
  barberId,
  salonName,
  variant,
  className,
}: {
  barberId?: string | null;
  salonName: string;
  variant: 'icon' | 'block';
  className?: string;
}) {
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [abierto, setAbierto] = useState(false);
  const base = `/api/qr/pago${barberId ? `?barberId=${encodeURIComponent(barberId)}` : ''}`;

  return (
    <>
      {disponible === null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={base}
          alt=""
          className="hidden"
          onLoad={() => setDisponible(true)}
          onError={() => setDisponible(false)}
        />
      )}

      {disponible &&
        (variant === 'icon' ? (
          <button type="button" onClick={() => setAbierto(true)} aria-label="Pagar por transferencia" className={className}>
            <Wallet className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={() => setAbierto(true)} className={className}>
            <Wallet className="w-4 h-4" aria-hidden="true" />
            Pagar por transferencia
          </button>
        ))}

      {abierto && <PagoQrDialog base={base} salonName={salonName} onCerrar={() => setAbierto(false)} />}
    </>
  );
}
