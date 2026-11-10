'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { UserRound, Plus, Trash2, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type Barbero = { id: string; name: string; active: boolean };

/** Código a partir del nombre: es lo que guardan las citas, no cambia después. */
function codigoDesde(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function BarberosPage() {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [original, setOriginal] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [nuevo, setNuevo] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/admin/barbers');
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'No se pudo cargar');
      setBarberos(body.barbers ?? []);
      setOriginal(JSON.stringify(body.barbers ?? []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar el equipo');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = () => {
    const name = nuevo.trim();
    if (name.length < 2) return;
    const id = codigoDesde(name);
    if (!id) {
      toast.error('Ese nombre no sirve para generar un código. Usa letras o números.');
      return;
    }
    if (barberos.some((b) => b.id === id)) {
      toast.error(`Ya hay alguien con el código "${id}".`);
      return;
    }
    setBarberos([...barberos, { id, name, active: true }]);
    setNuevo('');
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/barbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbers: barberos }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? 'No se pudo guardar');
        return;
      }
      setBarberos(body.barbers);
      setOriginal(JSON.stringify(body.barbers));
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      toast.success('Equipo guardado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const hayCambios = JSON.stringify(barberos) !== original;
  const activos = barberos.filter((b) => b.active).length;

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-4 md:px-6 py-4 flex items-center gap-3 sticky top-14 md:top-0 z-10 mt-14 md:mt-0">
          <div className="w-9 h-9 bg-cafe-gold/15 rounded-lg flex items-center justify-center shrink-0">
            <UserRound className="w-5 h-5 text-cafe-goldlight" />
          </div>
          <div>
            <h1 className="text-lg font-display font-medium text-cafe-text leading-tight">Barberos</h1>
            <p className="text-xs text-cafe-subtle">Quiénes atienden en el local</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-2xl space-y-6">
          <div className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6">
            <p className="text-sm text-cafe-muted leading-relaxed mb-5">
              Cada barbero ocupa un puesto: con {activos || 'ningún'} barbero{activos === 1 ? '' : 's'} activo
              {activos === 1 ? '' : 's'}, el local puede atender {activos || 1} cita{activos === 1 || activos === 0 ? '' : 's'} a
              la misma hora. El horario sigue siendo el del local, en la sección Horarios.
            </p>

            <div className="flex gap-2 mb-5">
              <input
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregar();
                  }
                }}
                placeholder="Nombre del barbero"
                maxLength={60}
                aria-label="Nombre del barbero nuevo"
                className="flex-1 min-w-0 bg-cafe-soft border border-cafe-border rounded-lg px-4 py-2.5 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 transition"
              />
              <button
                type="button"
                onClick={agregar}
                disabled={nuevo.trim().length < 2}
                className="flex items-center gap-2 px-4 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar</span>
              </button>
            </div>

            {cargando ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
              </div>
            ) : barberos.length === 0 ? (
              <p className="text-sm text-cafe-muted py-4">
                Todavía no hay barberos. Sin ellos, el local acepta una cita por horario, como hasta ahora.
              </p>
            ) : (
              <ul className="divide-y divide-cafe-border">
                {barberos.map((b, i) => (
                  <li key={b.id} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <input
                        value={b.name}
                        onChange={(e) => {
                          const copia = [...barberos];
                          copia[i] = { ...b, name: e.target.value };
                          setBarberos(copia);
                        }}
                        maxLength={60}
                        aria-label={`Nombre de ${b.name}`}
                        className="w-full bg-transparent text-sm font-medium text-cafe-text focus:outline-none focus:bg-cafe-soft rounded px-1 py-0.5"
                      />
                      <p className="text-xs text-cafe-subtle font-mono px-1">{b.id}</p>
                    </div>

                    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.active}
                        onChange={(e) => {
                          const copia = [...barberos];
                          copia[i] = { ...b, active: e.target.checked };
                          setBarberos(copia);
                        }}
                        className="w-4 h-4 rounded accent-cafe-gold"
                      />
                      <span className="text-xs text-cafe-muted">Activo</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setBarberos(barberos.filter((x) => x.id !== b.id))}
                      aria-label={`Quitar a ${b.name}`}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-cafe-subtle mt-4 leading-relaxed">
              Desmarcar <strong className="text-cafe-muted">Activo</strong> lo saca del selector del cliente pero
              conserva su historial. Quitarlo del todo solo es posible si no tiene ninguna cita registrada.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={guardar}
              disabled={!hayCambios || guardando}
              className="flex items-center gap-2 px-6 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {guardado ? (
                <><CheckCircle className="w-4 h-4" /> Guardado</>
              ) : guardando ? (
                <><div className="w-4 h-4 border-2 border-cafe-bg/30 border-t-cafe-bg rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar equipo</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
