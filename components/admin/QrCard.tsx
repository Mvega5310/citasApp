'use client';

import { useCallback, useEffect, useState } from 'react';
import { QrCode, Copy, Download, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const PAGINAS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'reservar', label: 'Reservar' },
] as const;

type Pagina = (typeof PAGINAS)[number]['id'];

export default function QrCard() {
  const [pagina, setPagina] = useState<Pagina>('inicio');
  const [destino, setDestino] = useState('');
  const [svg, setSvg] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    fetch(`/api/qr?pagina=${pagina}&formato=json`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? 'No se pudo generar el código');
        if (!vigente) return;
        setDestino(body.destino);
        setSvg(body.svg);
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudo generar el código');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [pagina]);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(destino);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona la dirección y cópiala a mano.');
    }
  }, [destino]);

  return (
    <div className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6">
      <h2 className="text-base font-semibold text-cafe-text mb-1 flex items-center gap-2">
        <QrCode className="w-4 h-4 text-cafe-goldlight" />
        Código QR para el local
      </h2>
      <p className="text-xs text-cafe-muted mb-5">
        Imprímelo y pégalo en la recepción o el espejo. Quien lo escanee llega directo a reservar.
      </p>

      <div className="flex gap-2 mb-5">
        {PAGINAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPagina(p.id)}
            aria-pressed={pagina === p.id}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              pagina === p.id
                ? 'bg-cafe-gold text-cafe-bg border-cafe-gold'
                : 'bg-cafe-soft text-cafe-muted border-cafe-border hover:text-cafe-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-cafe-muted bg-cafe-soft border border-cafe-border rounded-lg p-4">
          {error}
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="bg-white rounded-xl p-3 shrink-0 w-[168px] h-[168px] flex items-center justify-center">
            {cargando ? (
              <div className="w-6 h-6 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
            ) : (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                aria-label={`Código QR que lleva a ${destino}`}
                role="img"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 w-full">
            <p className="text-xs text-cafe-subtle mb-1.5">Lleva a</p>
            <p className="text-sm text-cafe-text font-mono break-all mb-4">{destino || '…'}</p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copiar}
                disabled={!destino}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-cafe-border bg-cafe-soft text-cafe-text hover:border-cafe-gold transition disabled:opacity-50"
              >
                {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar enlace'}
              </button>

              <a
                href={`/api/qr?pagina=${pagina}`}
                download={`qr-${pagina}.svg`}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-cafe-border bg-cafe-soft text-cafe-text hover:border-cafe-gold transition"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </a>
            </div>

            <p className="text-xs text-cafe-subtle mt-4 leading-relaxed">
              Se descarga en formato vectorial: se puede ampliar a cualquier tamaño sin que se
              pixele. Al imprimirlo, deja el borde blanco que trae — sin ese margen muchos
              lectores no lo enfocan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
