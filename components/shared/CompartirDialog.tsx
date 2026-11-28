'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Copy, Check, Share2, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { guardarImagen } from '@/lib/shared/descargarImagen';

/**
 * Qué mostrar y a qué URLs pegarle. Dos usos: el admin comparte su propio
 * sitio (`/api/qr`, con sesión) y el cliente comparte la barbería que está
 * viendo (`/api/qr/publico`, sin sesión) — ambas rutas hablan el mismo
 * protocolo (imagen por defecto, `&formato=json` para el texto, `&descargar=1`
 * para forzar la descarga), así que este diálogo no necesita saber cuál es.
 */
export type FuenteCompartir = {
  imagen: string;
  descarga: string;
  datos: string;
  archivo: string;
};

/**
 * Antes, compartir el enlace o el QR tomaba varios pasos: entrar a
 * Configuración, bajar hasta la sección, copiar o descargar, y recién ahí
 * pegarlo donde hiciera falta. Este diálogo es el acceso directo: un toque,
 * y ya está el QR en pantalla con la opción de copiar el enlace al lado.
 */
export default function CompartirDialog({
  titulo,
  mensaje,
  fuente,
  onCerrar,
}: {
  titulo: string;
  mensaje?: string;
  fuente: FuenteCompartir;
  onCerrar: () => void;
}) {
  const [destino, setDestino] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetch(fuente.datos)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? 'No se pudo generar');
        if (!vigente) return;
        setDestino(body.destino);
        setNombre(body.nombre ?? '');
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudo generar el enlace');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente.datos]);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(destino);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona la dirección y cópiala a mano.');
    }
  }, [destino]);

  const descargar = useCallback(async () => {
    setDescargando(true);
    try {
      await guardarImagen(fuente.descarga, fuente.archivo);
    } catch {
      toast.error('No se pudo guardar el código. Mantén presionada la imagen para guardarla.');
    } finally {
      setDescargando(false);
    }
  }, [fuente.descarga, fuente.archivo]);

  // navigator.share no existe en todos los navegadores (sobre todo de
  // escritorio): se ofrece como otro atajo más, no como el único camino.
  const puedeCompartirNativo = typeof navigator !== 'undefined' && 'share' in navigator;
  const compartirNativo = async () => {
    try {
      await navigator.share({ title: nombre || titulo, url: destino });
    } catch {
      // El usuario cerró el panel del sistema, o el navegador no pudo: no es
      // un error que merezca un aviso, el QR y "copiar" siguen ahí.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-cafe-card rounded-2xl shadow-xl w-full max-w-sm p-6 border border-cafe-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-display font-medium text-cafe-text">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-cafe-subtle hover:text-cafe-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        {mensaje && <p className="text-xs text-cafe-subtle mb-5 leading-relaxed">{mensaje}</p>}

        {error ? (
          <p className="text-sm text-cafe-muted bg-cafe-soft border border-cafe-border rounded-lg p-4 mt-4">
            {error}
          </p>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-xl p-3 w-40 h-40 flex items-center justify-center mt-3">
              {cargando ? (
                <div className="w-6 h-6 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fuente.imagen}
                  alt={`Código QR que lleva a ${destino}`}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <p className="text-xs text-cafe-subtle mt-3 text-center">
              Mantén presionado el código para guardarlo
            </p>

            <p className="text-sm text-cafe-text font-mono break-all mt-4 text-center">
              {destino || '…'}
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-4 w-full">
              <button
                type="button"
                onClick={copiar}
                disabled={!destino}
                className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border border-cafe-border bg-cafe-soft text-cafe-text hover:border-cafe-gold transition disabled:opacity-50"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado' : 'Copiar enlace'}
              </button>

              {puedeCompartirNativo && (
                <button
                  type="button"
                  onClick={compartirNativo}
                  disabled={!destino}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg transition disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              )}

              <button
                type="button"
                onClick={descargar}
                disabled={descargando}
                className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border border-cafe-border bg-cafe-soft text-cafe-text hover:border-cafe-gold transition disabled:opacity-50"
              >
                {descargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
