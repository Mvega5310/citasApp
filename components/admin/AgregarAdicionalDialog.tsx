'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type ServicioCat = { id: string; name: string; price: number; active: boolean };
type BarberoCat = { id: string; name: string; active: boolean };

const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date().toTimeString().slice(0, 5);

/**
 * Registra un corte que no pasó por la reserva: no llegó quien apartó y el
 * barbero atendió a otra persona, o le alcanzó el tiempo para uno más. Entra
 * directo como completada -ya sucedió- y queda marcada como "adicional" para
 * distinguirla en el listado y en el Cierre, sin perderla de la facturación.
 */
export default function AgregarAdicionalDialog({
  onCerrar,
  onCreado,
}: {
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [servicios, setServicios] = useState<ServicioCat[]>([]);
  const [barberos, setBarberos] = useState<BarberoCat[]>([]);

  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [date, setDate] = useState(hoy());
  const [time, setTime] = useState(ahora());
  const [price, setPrice] = useState<number | ''>('');
  const [clientName, setClientName] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/catalog').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/barbers').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([catalogo, equipo]) => {
        const activos: ServicioCat[] = (catalogo?.services ?? []).filter((s: ServicioCat) => s.active);
        setServicios(activos);
        if (activos[0]) {
          setServiceId(activos[0].id);
          setPrice(activos[0].price);
        }
        setBarberos((equipo?.barbers ?? []).filter((b: BarberoCat) => b.active));
      })
      .finally(() => setCargando(false));
  }, []);

  const cambiarServicio = (id: string) => {
    setServiceId(id);
    const s = servicios.find((x) => x.id === id);
    if (s) setPrice(s.price);
  };

  const guardar = async () => {
    if (!serviceId || !date || !time) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/appointments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          date,
          time,
          barberId: barberId || null,
          price: price === '' ? undefined : price,
          clientName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo registrar');
        return;
      }
      toast.success('Adicional registrado');
      onCreado();
      onCerrar();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-cafe-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-cafe-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-display font-medium text-cafe-text flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cafe-goldlight" />
            Registrar adicional
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-cafe-subtle hover:text-cafe-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-cafe-subtle mb-5 leading-relaxed">
          Para un corte que no pasó por la reserva: no llegó quien apartó y se atendió a otra persona,
          o alcanzó el tiempo para uno más. Queda marcado como adicional y suma al Cierre.
        </p>

        {cargando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-cafe-gold" />
          </div>
        ) : servicios.length === 0 ? (
          <p className="text-sm text-cafe-muted py-4">
            No hay servicios activos en el catálogo. Agrega uno en Servicios primero.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="adicional-servicio" className="block text-sm font-medium text-cafe-text mb-1.5">
                Servicio
              </label>
              <select
                id="adicional-servicio"
                value={serviceId}
                onChange={(e) => cambiarServicio(e.target.value)}
                className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
              >
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {barberos.length > 0 && (
              <div>
                <label htmlFor="adicional-barbero" className="block text-sm font-medium text-cafe-text mb-1.5">
                  Barbero
                </label>
                <select
                  id="adicional-barbero"
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
                >
                  <option value="">Sin asignar</option>
                  {barberos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="adicional-fecha" className="block text-sm font-medium text-cafe-text mb-1.5">
                  Fecha
                </label>
                <input
                  id="adicional-fecha"
                  type="date"
                  value={date}
                  max={hoy()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-3 py-2.5 text-sm text-cafe-text [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
                />
              </div>
              <div>
                <label htmlFor="adicional-hora" className="block text-sm font-medium text-cafe-text mb-1.5">
                  Hora
                </label>
                <input
                  id="adicional-hora"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-3 py-2.5 text-sm text-cafe-text [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="adicional-precio" className="block text-sm font-medium text-cafe-text mb-1.5">
                Precio
              </label>
              <input
                id="adicional-precio"
                type="number"
                min={0}
                step={500}
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text tabular-nums focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
              />
              <p className="text-xs text-cafe-subtle mt-1.5">
                Se rellena con el precio del servicio; cámbialo si cobraste distinto.
              </p>
            </div>

            <div>
              <label htmlFor="adicional-cliente" className="block text-sm font-medium text-cafe-text mb-1.5">
                Cliente <span className="text-cafe-subtle font-normal">(opcional)</span>
              </label>
              <input
                id="adicional-cliente"
                type="text"
                value={clientName}
                maxLength={60}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Cliente sin reserva"
                className="w-full bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-sm text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
              />
            </div>
          </div>
        )}

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
            disabled={guardando || cargando || servicios.length === 0}
            onClick={guardar}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
