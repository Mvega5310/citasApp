'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmacion } from '@/components/admin/useConfirmacion';

/** Mismo lado que acepta el servidor (`lib/server/logoPng.ts`). */
const LADO = 512;

/**
 * Redimensiona en el navegador antes de subir.
 *
 * El proyecto no tiene `sharp` —es una dependencia nativa y no vale la pena
 * añadirla solo para esto—, y además así no viaja un archivo enorme: el logo
 * original de la barbería eran 1,78 MB a 2048×2048.
 *
 * El recorte es centrado y cuadrado porque el logo se pinta en círculos y
 * cuadrados de lado fijo en toda la app; uno alargado saldría deformado.
 */
async function aPngCuadrado(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO;
  lienzo.height = LADO;

  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    bitmap,
    (bitmap.width - lado) / 2,
    (bitmap.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    LADO,
    LADO
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/png'));
  if (!blob) throw new Error('El navegador no pudo generar el PNG.');
  return blob;
}

export default function LogoUploader() {
  const { confirmar, dialogo } = useConfirmacion();
  const entrada = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);
  // Cambia la URL tras guardar: si no, el navegador sigue pintando el anterior
  // de su caché y parece que no se guardó.
  const [version, setVersion] = useState(() => Date.now());

  const subir = async (archivo: File) => {
    setTrabajando(true);
    try {
      const png = await aPngCuadrado(archivo);
      const res = await fetch('/api/admin/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: png,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo guardar el logo');
        return;
      }
      setVersion(Date.now());
      toast.success('Logo actualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo leer la imagen');
    } finally {
      setTrabajando(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const quitar = async () => {
    const seguro = await confirmar({
      titulo: '¿Quitar el logo?',
      mensaje: 'Se mostrarán las iniciales de la barbería hasta que subas otro.',
      aceptar: 'Quitar',
      peligro: true,
    });
    if (!seguro) return;
    setTrabajando(true);
    try {
      const res = await fetch('/api/admin/logo', { method: 'DELETE' });
      if (!res.ok) {
        toast.error('No se pudo quitar el logo');
        return;
      }
      setVersion(Date.now());
      toast.success('Logo quitado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/logo?size=192&v=${version}`}
        alt="Logo de la barbería"
        className="w-20 h-20 rounded-2xl object-cover border border-cafe-border bg-cafe-soft shrink-0"
      />

      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={trabajando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold transition disabled:opacity-60"
          >
            {trabajando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
            Cambiar logo
          </button>
          <button
            type="button"
            onClick={quitar}
            disabled={trabajando}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-cafe-border text-cafe-muted hover:text-red-300 hover:border-red-400/40 text-sm font-medium transition disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            Quitar
          </button>
        </div>
        <p className="text-xs text-cafe-subtle leading-relaxed">
          Cuadrado y de al menos 64 píxeles. Se recorta al centro y se reduce a {LADO}×{LADO} antes de
          subirlo, así que no importa si tu archivo es grande. Aparece en la página del cliente, en el
          panel, y como icono al instalar la app en el teléfono.
        </p>
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
