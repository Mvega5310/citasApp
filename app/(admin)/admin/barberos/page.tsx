'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { UserRound, Plus, Trash2, Save, CheckCircle } from 'lucide-react';
import CampoNumero from '@/components/admin/CampoNumero';
import { invalidateCatalog } from '@/lib/shared/useCatalog';
import toast from 'react-hot-toast';
import { useConfirmacion } from '@/components/admin/useConfirmacion';

type Modalidad = 'comision' | 'puesto';
type Barbero = {
  id: string;
  name: string;
  active: boolean;
  commission: number;
  modalidad: Modalidad;
  tarifaDiaria: number;
};

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

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

const MODALIDADES = [
  {
    id: 'comision' as const,
    label: 'Comisión',
    ayuda: 'Lo que produce es del local, que le paga un porcentaje.',
  },
  {
    id: 'puesto' as const,
    label: 'Paga puesto',
    ayuda: 'Lo que produce es suyo, y le paga al local una tarifa por día trabajado.',
  },
];

export default function BarberosPage() {
  const { confirmar, dialogo } = useConfirmacion();
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
    setBarberos([
      ...barberos,
      { id, name, active: true, commission: 0, modalidad: 'comision', tarifaDiaria: 0 },
    ]);
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
      // El selector del cliente lee los barberos del catálogo
      await invalidateCatalog();
      toast.success('Equipo guardado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Quitar a alguien del equipo no preguntaba nada: un toque en el bote de
   * basura y desaparecía. En un teléfono eso se hace sin querer con facilidad.
   */
  const quitar = async (b: Barbero) => {
    const seguro = await confirmar({
      titulo: `¿Quitar a ${b.name || 'este barbero'} del equipo?`,
      mensaje:
        'Sus citas ya registradas no se borran. Si solo deja de atender por un tiempo, desmárcalo como activo en vez de quitarlo.',
      aceptar: 'Quitar',
      peligro: true,
    });
    if (!seguro) return;
    setBarberos((prev) => prev.filter((x) => x.id !== b.id));
  };

  const cambiar = (i: number, patch: Partial<Barbero>) => {
    const copia = [...barberos];
    copia[i] = { ...copia[i], ...patch };
    setBarberos(copia);
  };

  const hayCambios = JSON.stringify(barberos) !== original;
  const hayPuesto = barberos.some((b) => b.modalidad === 'puesto');
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
                  <li key={b.id} className="py-3.5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <input
                          value={b.name}
                          onChange={(e) => cambiar(i, { name: e.target.value })}
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
                          onChange={(e) => cambiar(i, { active: e.target.checked })}
                          className="w-4 h-4 rounded accent-cafe-gold"
                        />
                        <span className="text-xs text-cafe-muted">Activo</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => quitar(b)}
                        aria-label={`Quitar a ${b.name}`}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cómo se reparte lo que produce. Son modelos opuestos, así que
                        cada uno muestra solo su propio campo: ver los dos juntos
                        sugiere que se suman, y no se suman. */}
                    <div className="flex flex-wrap items-center gap-2 pl-1">
                      <div className="flex rounded-lg border border-cafe-border overflow-hidden shrink-0">
                        {MODALIDADES.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => cambiar(i, { modalidad: m.id })}
                            aria-pressed={b.modalidad === m.id}
                            title={m.ayuda}
                            className={`px-3 py-1.5 text-xs font-semibold transition ${
                              b.modalidad === m.id
                                ? 'bg-cafe-gold text-cafe-bg'
                                : 'bg-cafe-soft text-cafe-muted hover:text-cafe-text'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {b.modalidad === 'comision' ? (
                        <label className="flex items-center gap-1.5 text-xs text-cafe-subtle">
                          <span>le queda el</span>
                          <CampoNumero
                            min={0}
                            max={100}
                            step={1}
                            value={b.commission}
                            onChange={(n) => cambiar(i, { commission: n })}
                            aria-label={`Porcentaje de ${b.name}`}
                            className="w-14 bg-cafe-soft border border-cafe-border rounded-lg px-2 py-1 text-sm text-cafe-text text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
                          />
                          <span>% de lo que produce</span>
                          {b.commission === 0 && <span className="text-cafe-muted">· a sueldo</span>}
                        </label>
                      ) : (
                        <label className="flex items-center gap-1.5 text-xs text-cafe-subtle">
                          <span>paga</span>
                          <CampoNumero
                            min={0}
                            max={10000000}
                            step={1000}
                            value={b.tarifaDiaria}
                            onChange={(n) => cambiar(i, { tarifaDiaria: n })}
                            aria-label={`Tarifa diaria de ${b.name}`}
                            className="w-28 bg-cafe-soft border border-cafe-border rounded-lg px-2 py-1 text-sm text-cafe-text text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
                          />
                          <span>por día trabajado</span>
                          {b.tarifaDiaria > 0 && (
                            <span className="text-cafe-muted">· {pesos(b.tarifaDiaria)}</span>
                          )}
                        </label>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-cafe-subtle mt-4 leading-relaxed">
              Desmarcar <strong className="text-cafe-muted">Activo</strong> lo saca del selector del cliente pero
              conserva su historial. Quitarlo del todo solo es posible si no tiene ninguna cita registrada.
            </p>
            <p className="text-xs text-cafe-subtle mt-2 leading-relaxed">
              <strong className="text-cafe-muted">Comisión</strong>: lo que produce es del local, que le paga ese
              porcentaje. Déjalo en 0 si trabaja a sueldo.{' '}
              <strong className="text-cafe-muted">Paga puesto</strong>: lo que produce es suyo, y le paga al local
              la tarifa por cada día que trabajó. Es el caso del local compartido entre colegas.
            </p>
            {hayPuesto && (
              <p className="text-xs text-cafe-subtle mt-2 leading-relaxed">
                Cierre cuenta los <strong className="text-cafe-muted">días con citas completadas</strong>: si
                alguien no trabajó un día, ese día no se le cobra. Si entre ustedes el acuerdo es cobrar el puesto
                igual aunque no venga, ese ajuste va por fuera.
              </p>
            )}
            <p className="text-xs text-cafe-subtle mt-2 leading-relaxed">
              Las dos cifras son el acuerdo vigente, no se guardan por cita: si las cambias, un periodo ya pagado
              mostrará otro número al volver a consultarlo.
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
      {dialogo}
    </div>
  );
}
