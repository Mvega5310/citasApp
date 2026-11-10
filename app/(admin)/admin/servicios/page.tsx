'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import ServiceIcon from '@/components/shared/ServiceIcon';
import { Clock, Loader2, Plus, RotateCcw, Save, Scissors, Trash2 } from 'lucide-react';
import { invalidateCatalog } from '@/lib/shared/useCatalog';
import toast from 'react-hot-toast';

// Mismo formato que devuelve /api/admin/catalog
type DayKey = 'domingo' | 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';
type EditableService = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
  /** Solo en el navegador: servicio nuevo, su id se genera al guardar. */
  isNew?: boolean;
  /** Solo en el navegador: clave estable para React. */
  key: string;
};
type Hours = Record<DayKey, { open: string; close: string; closed: boolean }>;

// Orden de la semana para mostrar (lunes primero)
const WEEK: { key: DayKey; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const inputCls =
  'w-full bg-cafe-soft border border-cafe-border rounded-lg px-3 py-2.5 text-sm text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition disabled:opacity-60';

let keySeq = 0;
const nextKey = () => `k${++keySeq}`;

// "Corte Clásico" → "corte-clasico"
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

function withIds(services: EditableService[]): EditableService[] {
  const used = new Set(services.filter((s) => !s.isNew).map((s) => s.id));
  return services.map((s) => {
    if (!s.isNew) return s;
    const base = slugify(s.name) || 'servicio';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base.slice(0, 36)}-${n}`;
    used.add(id);
    return { ...s, id };
  });
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-cafe-gold' : 'bg-cafe-border'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-cafe-text shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function ServiciosAdminPage() {
  const [services, setServices] = useState<EditableService[]>([]);
  const [hours, setHours] = useState<Hours | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  // Servicio recién agregado: se lleva a la vista y se enfoca su nombre
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [catalogRes, meRes] = await Promise.all([fetch('/api/admin/catalog'), fetch('/api/admin/me')]);
      if (!catalogRes.ok) {
        const d = await catalogRes.json().catch(() => ({}));
        toast.error(d.error || 'No se pudo cargar el catálogo');
        return;
      }
      const data = await catalogRes.json();
      const loaded: EditableService[] = data.services.map((s: Omit<EditableService, 'key'>) => ({ ...s, key: nextKey() }));
      setServices(loaded);
      setHours(data.workingHours);
      setSnapshot(JSON.stringify({ services: loaded.map(({ key: _k, ...s }) => s), hours: data.workingHours }));
      const me = meRes.ok ? await meRes.json() : null;
      setCanEdit(me?.role === 'admin');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dirty = useMemo(
    () => !!hours && JSON.stringify({ services: services.map(({ key: _k, ...s }) => s), hours }) !== snapshot,
    [services, hours, snapshot]
  );

  const updateService = (key: string, patch: Partial<EditableService>) =>
    setServices((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const addService = () => {
    const key = nextKey();
    setServices((prev) => [
      ...prev,
      { key, id: '', name: '', description: '', duration: 30, price: 0, active: true, isNew: true },
    ]);
    setJustAdded(key);
  };

  useEffect(() => {
    if (!justAdded) return;
    const frame = requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById(`svc-${justAdded}`)
        ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      (document.getElementById(`svc-name-${justAdded}`) as HTMLInputElement | null)?.focus({ preventScroll: true });
      setJustAdded(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [justAdded]);

  const removeService = (svc: EditableService) => {
    if (!svc.isNew && !confirm(`¿Quitar "${svc.name}" del catálogo? Las citas ya reservadas no se borran. Si solo quieres dejar de ofrecerlo por un tiempo, desactívalo.`)) {
      return;
    }
    setServices((prev) => prev.filter((s) => s.key !== svc.key));
  };

  const updateDay = (day: DayKey, patch: Partial<Hours[DayKey]>) =>
    setHours((prev) => (prev ? { ...prev, [day]: { ...prev[day], ...patch } } : prev));

  const handleSave = async () => {
    if (!hours) return;
    setSaving(true);
    try {
      const payload = withIds(services).map(({ key: _k, isNew: _n, ...s }) => s);
      const res = await fetch('/api/admin/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: payload, workingHours: hours }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'No se pudo guardar');
        return;
      }
      const saved: EditableService[] = data.services.map((s: Omit<EditableService, 'key'>) => ({ ...s, key: nextKey() }));
      setServices(saved);
      setHours(data.workingHours);
      setSnapshot(JSON.stringify({ services: saved.map(({ key: _k, ...s }) => s), hours: data.workingHours }));
      // El catálogo lo leen Horarios y el sitio del cliente: sin esto se
      // quedaban con la copia vieja hasta recargar la página entera.
      await invalidateCatalog();
      toast.success('Servicios y horario guardados');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = services.filter((s) => s.active).length;

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior */}
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-4 md:px-6 py-4 flex items-center justify-between gap-3 sticky top-14 md:top-0 z-10 mt-14 md:mt-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-cafe-gold/15 rounded-lg flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5 text-cafe-goldlight" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-display font-medium text-cafe-text leading-tight">Servicios y horario</h1>
              <p className="text-xs text-cafe-subtle truncate">Lo que tus clientes ven y pueden reservar</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              {dirty && !saving && (
                <button
                  onClick={load}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-cafe-muted hover:text-cafe-text rounded-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  Descartar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-4xl w-full space-y-8">
          {loading || !hours ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {!canEdit && (
                <p className="rounded-xl px-4 py-3 text-sm bg-cafe-card border border-cafe-border text-cafe-muted">
                  Solo los administradores pueden modificar los servicios y el horario.
                </p>
              )}

              {/* Servicios */}
              <section>
                <div className="flex items-end justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-display text-xl font-medium">Servicios</h2>
                    <p className="text-xs text-cafe-muted mt-0.5">
                      {activeCount} activo{activeCount !== 1 ? 's' : ''} de {services.length}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={addService}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-full border border-cafe-gold/40 bg-cafe-gold/10 text-cafe-goldlight hover:bg-cafe-gold/20 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar servicio
                    </button>
                  )}
                </div>

                {services.length === 0 && (
                  <p className="rounded-xl p-6 text-center text-sm bg-cafe-card border border-cafe-border text-cafe-muted">
                    Aún no tienes servicios. Agrega el primero para que tus clientes puedan reservar.
                  </p>
                )}

                <div className="space-y-3">
                  {services.map((svc) => (
                    <div
                      key={svc.key}
                      id={`svc-${svc.key}`}
                      className={`relative rounded-2xl border p-4 transition-colors scroll-mt-32 ${
                        svc.isNew
                          ? 'bg-cafe-card border-cafe-gold/70 ring-2 ring-cafe-gold/20'
                          : svc.active
                            ? 'bg-cafe-card border-cafe-border'
                            : 'bg-cafe-soft border-cafe-border/60'
                      }`}
                    >
                      {svc.isNew && (
                        <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-cafe-gold text-cafe-bg text-[10px] font-bold uppercase tracking-wider">
                          Nuevo
                        </span>
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-cafe-soft border border-cafe-border ${
                            svc.active ? 'text-cafe-gold' : 'text-cafe-subtle'
                          }`}
                        >
                          <ServiceIcon serviceId={svc.id} size={20} />
                        </div>

                        <div className="flex-1 min-w-0 grid gap-3 sm:grid-cols-[1fr_110px_140px]">
                          <div className="sm:col-span-3 grid gap-2 sm:grid-cols-2">
                            <input
                              id={`svc-name-${svc.key}`}
                              value={svc.name}
                              onChange={(e) => updateService(svc.key, { name: e.target.value })}
                              placeholder="Nombre del servicio"
                              aria-label="Nombre del servicio"
                              maxLength={60}
                              disabled={!canEdit}
                              className={inputCls}
                            />
                            <input
                              value={svc.description}
                              onChange={(e) => updateService(svc.key, { description: e.target.value })}
                              placeholder="Descripción breve (opcional)"
                              aria-label="Descripción"
                              maxLength={200}
                              disabled={!canEdit}
                              className={inputCls}
                            />
                          </div>
                          <label className="text-xs text-cafe-muted">
                            Duración (min)
                            <input
                              type="number"
                              min={5}
                              max={480}
                              step={5}
                              value={svc.duration}
                              onChange={(e) => updateService(svc.key, { duration: Number(e.target.value) })}
                              disabled={!canEdit}
                              className={`${inputCls} mt-1`}
                            />
                          </label>
                          <label className="text-xs text-cafe-muted">
                            Precio (COP)
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={svc.price}
                              onChange={(e) => updateService(svc.key, { price: Number(e.target.value) })}
                              disabled={!canEdit}
                              className={`${inputCls} mt-1`}
                            />
                          </label>
                          <div className="flex items-end justify-between gap-3 sm:justify-end">
                            <div className="flex items-center gap-2 pb-2">
                              <Toggle
                                checked={svc.active}
                                onChange={(v) => updateService(svc.key, { active: v })}
                                disabled={!canEdit}
                                label={`${svc.name || 'Servicio'} activo`}
                              />
                              <span className="text-xs text-cafe-muted w-14">{svc.active ? 'Activo' : 'Inactivo'}</span>
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => removeService(svc)}
                                aria-label={`Quitar ${svc.name || 'servicio'}`}
                                className="p-2 mb-0.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Horario general */}
              <section>
                <div className="mb-4">
                  <h2 className="font-display text-xl font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cafe-gold" />
                    Horario de atención
                  </h2>
                  <p className="text-xs text-cafe-muted mt-0.5">
                    Los turnos se ofrecen cada 30 minutos dentro de este horario. Para cerrar horas puntuales usa
                    Horarios.
                  </p>
                </div>

                <div className="rounded-2xl border border-cafe-border bg-cafe-card divide-y divide-cafe-border">
                  {WEEK.map(({ key, label }) => {
                    const day = hours[key];
                    return (
                      <div key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="w-24 text-sm font-medium">{label}</span>
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={!day.closed}
                            onChange={(open) => updateDay(key, { closed: !open })}
                            disabled={!canEdit}
                            label={`${label} abierto`}
                          />
                          <span className={`text-xs w-14 ${day.closed ? 'text-cafe-subtle' : 'text-cafe-muted'}`}>
                            {day.closed ? 'Cerrado' : 'Abierto'}
                          </span>
                        </div>
                        {!day.closed && (
                          <div className="flex items-center gap-2 ml-auto">
                            <input
                              type="time"
                              step={1800}
                              value={day.open}
                              onChange={(e) => updateDay(key, { open: e.target.value })}
                              aria-label={`${label}: apertura`}
                              disabled={!canEdit}
                              className={`${inputCls} w-28`}
                            />
                            <span className="text-cafe-subtle text-sm">a</span>
                            <input
                              type="time"
                              step={1800}
                              value={day.close}
                              onChange={(e) => updateDay(key, { close: e.target.value })}
                              aria-label={`${label}: cierre`}
                              disabled={!canEdit}
                              className={`${inputCls} w-28`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
