'use client';

import { useState } from 'react';
import { X, CalendarClock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Plan = { hasta: string | null; precio: number; nota: string };

/**
 * Fija el plan acordado con una barbería.
 *
 * Aquí no se cobra: esto es un registro. La barbería paga por donde sea
 * (Nequi, efectivo, lo que acuerden) y aquí se anota hasta cuándo quedó
 * cubierta, para no perder la cuenta.
 */
export default function PlanDialog({
  barberia,
  onCerrar,
  onGuardado,
}: {
  barberia: { slug: string; name: string; plan: Plan };
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [hasta, setHasta] = useState(barberia.plan.hasta ?? '');
  const [precio, setPrecio] = useState(barberia.plan.precio);
  const [nota, setNota] = useState(barberia.plan.nota);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (cuerpo: Record<string, unknown>) => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/tenants/${barberia.slug}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo guardar');
        return;
      }
      toast.success('Plan actualizado');
      onGuardado();
      onCerrar();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      /* z-[70] como el resto de los diálogos: la barra superior del móvil es
         z-[60], y con z-50 el título quedaba tapado debajo de ella. */
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        /* En un teléfono el diálogo es más alto que la pantalla: que ruede
           por dentro en vez de salirse. */
        className="bg-cafe-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-cafe-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-display font-medium text-cafe-text flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-cafe-goldlight" />
            Plan de {barberia.name || barberia.slug}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-cafe-subtle hover:text-cafe-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-cafe-subtle mb-5 leading-relaxed">
          Esto no cobra nada: anota lo acordado para no perder la cuenta. Vencerse tampoco suspende a
          la barbería — eso se decide aparte.
        </p>

        {/* Atajos: lo que de verdad se hace a diario */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { label: '3 meses de prueba', meses: 3, precio: 0 },
            { label: 'Renovar 1 mes', meses: 1, precio: undefined },
            { label: 'Renovar 3 meses', meses: 3, precio: undefined },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={guardando}
              onClick={() =>
                enviar({ renovarMeses: a.meses, precio: a.precio ?? precio, nota })
              }
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-cafe-soft border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold/40 transition disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="plan-hasta" className="block text-sm font-medium text-cafe-text mb-1.5">
              Cubierta hasta
            </label>
            <input
              id="plan-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
            />
            <p className="text-xs text-cafe-subtle mt-1.5">
              Vacío = sin plazo, no vence nunca (cortesía).
            </p>
          </div>

          <div>
            <label htmlFor="plan-precio" className="block text-sm font-medium text-cafe-text mb-1.5">
              Mensualidad acordada
            </label>
            <input
              id="plan-precio"
              type="number"
              min={0}
              step={1000}
              value={precio}
              onChange={(e) => setPrecio(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text tabular-nums focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
            />
            <p className="text-xs text-cafe-subtle mt-1.5">
              0 mientras esté en prueba. Sale como &ldquo;en prueba&rdquo; en vez de &ldquo;al día&rdquo;.
            </p>
          </div>

          <div>
            <label htmlFor="plan-nota" className="block text-sm font-medium text-cafe-text mb-1.5">
              Cómo paga
            </label>
            <input
              id="plan-nota"
              type="text"
              value={nota}
              maxLength={200}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nequi el 5 de cada mes"
              className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 px-4 py-2.5 border border-cafe-border text-cafe-text text-sm font-medium rounded-lg hover:bg-cafe-soft transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => enviar({ hasta: hasta || null, precio, nota })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
