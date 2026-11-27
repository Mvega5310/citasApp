'use client';

import { useEffect, useRef, useState } from 'react';
import { QrCode, Trash2, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmacion } from '@/components/admin/useConfirmacion';

/** Mismo lado que acepta el servidor (`lib/server/logoPng.ts`). */
const LADO = 512;

/**
 * Encaja la imagen entera dentro de un lienzo cuadrado, con relleno blanco en
 * los bordes que sobren -nunca recorta-.
 *
 * Es justo lo contrario del recorte centrado que usa el logo (`LogoUploader`,
 * que SÍ recorta): ahí un borde de más no importa, pero aquí la imagen suele
 * ser la captura de un banco con el QR en el medio, y recortar al centro
 * puede comerse una esquina del patrón y dejarlo imposible de escanear.
 */
async function aPngCuadradoSinRecortar(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO;
  lienzo.height = LADO;

  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen.');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.imageSmoothingQuality = 'high';

  const escala = Math.min(LADO / bitmap.width, LADO / bitmap.height);
  const anchoFinal = bitmap.width * escala;
  const altoFinal = bitmap.height * escala;
  ctx.drawImage(
    bitmap,
    (LADO - anchoFinal) / 2,
    (LADO - altoFinal) / 2,
    anchoFinal,
    altoFinal
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/png'));
  if (!blob) throw new Error('El navegador no pudo generar el PNG.');
  return blob;
}

/**
 * Subir/quitar un QR de cobro (Nequi, Daviplata, lo que uses). Solo guarda la
 * imagen: la app nunca procesa ni ve el pago real, es para evitar la
 * comisión de una pasarela mostrando el QR que ya usas a mano.
 */
export default function PagoQrUploader({
  endpoint,
  etiqueta,
  compacto = false,
}: {
  /** La misma ruta sirve, recibe y borra: GET/POST/DELETE. */
  endpoint: string;
  etiqueta: string;
  /** Fila angosta para la lista de barberos, en vez de la tarjeta completa. */
  compacto?: boolean;
}) {
  const { confirmar, dialogo } = useConfirmacion();
  const entrada = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [hay, setHay] = useState<boolean | null>(null);
  // Cambia la URL tras guardar: si no, el navegador sigue pintando la
  // anterior desde su caché y parece que no se guardó.
  const [version, setVersion] = useState(() => Date.now());

  const subir = async (archivo: File) => {
    setTrabajando(true);
    try {
      const png = await aPngCuadradoSinRecortar(archivo);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: png,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo guardar el QR');
        return;
      }
      setHay(true);
      setVersion(Date.now());
      toast.success(`QR de ${etiqueta} actualizado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo leer la imagen');
    } finally {
      setTrabajando(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const quitar = async () => {
    const seguro = await confirmar({
      titulo: `¿Quitar el QR de ${etiqueta}?`,
      mensaje: 'Puedes subir otro cuando quieras.',
      aceptar: 'Quitar',
      peligro: true,
    });
    if (!seguro) return;
    setTrabajando(true);
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('No se pudo quitar el QR');
        return;
      }
      setHay(false);
      toast.success('QR quitado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setTrabajando(false);
    }
  };

  // Se reinicia al cambiar de endpoint: este mismo componente se reusa para
  // cada fila de barbero, y "hay QR" es una respuesta por barbero, no una.
  useEffect(() => {
    setHay(null);
  }, [endpoint]);

  return (
    <div className={compacto ? 'flex items-center gap-3' : 'flex items-center gap-5'}>
      <div
        className={`${
          compacto ? 'w-12 h-12' : 'w-20 h-20'
        } relative rounded-xl border border-cafe-border bg-white shrink-0 flex items-center justify-center overflow-hidden`}
      >
        {/* Icono de respaldo mientras no se sabe si hay QR, o si no lo hay:
            la imagen de abajo decide con su propio onLoad/onError, así que no
            hace falta una consulta aparte solo para preguntar "¿existe?". */}
        {hay !== true && (
          <QrCode className={compacto ? 'w-5 h-5 text-cafe-subtle' : 'w-8 h-8 text-cafe-subtle'} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${endpoint}?v=${version}`}
          alt={`QR de pago de ${etiqueta}`}
          onLoad={() => setHay(true)}
          onError={() => setHay(false)}
          className={`absolute inset-0 w-full h-full object-contain ${hay ? '' : 'invisible'}`}
        />
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={trabajando}
            className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-60 ${
              compacto
                ? 'px-2.5 py-1.5 text-xs border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold/40'
                : 'px-4 py-2 text-sm bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg'
            }`}
          >
            {trabajando ? (
              <Loader2 className={compacto ? 'w-3.5 h-3.5 animate-spin' : 'w-4 h-4 animate-spin'} />
            ) : (
              <Upload className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            )}
            {hay ? 'Cambiar QR' : 'Subir QR'}
          </button>
          {hay && (
            <button
              type="button"
              onClick={quitar}
              disabled={trabajando}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-cafe-border text-cafe-muted hover:text-red-300 hover:border-red-400/40 transition disabled:opacity-60 ${
                compacto ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm font-medium'
              }`}
            >
              <Trash2 className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              {!compacto && 'Quitar'}
            </button>
          )}
        </div>
        {!compacto && (
          <p className="text-xs text-cafe-subtle leading-relaxed">
            Sube la captura de tu QR de Nequi, Daviplata o lo que uses. No se recorta -se encaja
            completo-, así el código no queda inservible.
          </p>
        )}
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) subir(archivo);
        }}
      />
      {dialogo}
    </div>
  );
}
