'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { BarChart3, Download } from 'lucide-react';
import toast from 'react-hot-toast';

type Linea = { nombre: string; citas: number; total: number; sinPrecio: number };
type LineaBarbero = Linea & {
  porcentaje: number;
  leToca: number;
  modalidad: 'comision' | 'puesto';
  tarifaDiaria: number;
  diasTrabajados: number;
  debeAlLocal: number;
  neto: number;
};
type Informe = {
  desde: string;
  hasta: string;
  resumen: {
    total: number;
    paraElLocal: number;
    completadas: number;
    canceladas: number;
    cancelacionesTarde: number;
    pendientes: number;
    sinPrecio: number;
    ticketPromedio: number;
  };
  porBarbero: LineaBarbero[];
  totalComisiones: number;
  totalPuestos: number;
  /** El servidor limitó el informe a las citas de un solo barbero. */
  soloMias: boolean;
  porServicio: Linea[];
};

const hoy = () => new Date().toISOString().slice(0, 10);
const hace = (dias: number) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
// El signo va delante del símbolo: "$-24.000" se lee mal de un vistazo.
const pesos = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('es-CO')}`;

const RANGOS = [
  { id: 'hoy', label: 'Hoy', desde: hoy, hasta: hoy },
  { id: 'semana', label: '7 días', desde: () => hace(6), hasta: hoy },
  { id: 'mes', label: '30 días', desde: () => hace(29), hasta: hoy },
] as const;

export default function InformePage() {
  const [desde, setDesde] = useState(hace(29));
  const [hasta, setHasta] = useState(hoy());
  const [datos, setDatos] = useState<Informe | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/informe?desde=${desde}&hasta=${hasta}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'No se pudo generar');
      setDatos(body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el informe');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const exportar = () => {
    if (!datos) return;
    const filas = [
      ['Informe de cierre', `${datos.desde} a ${datos.hasta}`],
      [],
      ['Facturado', datos.resumen.total],
      ['Queda para el local', datos.resumen.paraElLocal],
      ['Citas completadas', datos.resumen.completadas],
      ['Canceladas', datos.resumen.canceladas],
      ['Canceladas sobre la hora', datos.resumen.cancelacionesTarde],
      ['Ticket promedio', datos.resumen.ticketPromedio],
      [],
      ['Barbero', 'Citas', 'Produjo', 'Modalidad', 'Días', 'Paga puesto', '%', 'Le queda'],
      ...datos.porBarbero.map((b) => [
        b.nombre,
        b.citas,
        b.total,
        b.modalidad === 'puesto' ? 'Paga puesto' : 'Comisión',
        b.modalidad === 'puesto' ? b.diasTrabajados : '',
        b.modalidad === 'puesto' ? b.debeAlLocal : '',
        b.modalidad === 'comision' ? b.porcentaje : '',
        b.neto,
      ]),
      ['', '', '', '', '', 'Puestos cobrados', datos.totalPuestos, ''],
      ['', '', '', '', '', 'Comisiones a pagar', datos.totalComisiones, ''],
      ['', '', '', '', '', 'Queda para el local', datos.resumen.paraElLocal, ''],
      [],
      ['Servicio', 'Citas', 'Facturado'],
      ...datos.porServicio.map((s) => [s.nombre, s.citas, s.total]),
    ];
    // Punto y coma: Excel en español usa la coma como separador decimal
    const csv = filas.map((f) => f.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-${datos.desde}-a-${datos.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Tabla = ({ titulo, lineas, etiqueta }: { titulo: string; lineas: Linea[]; etiqueta: string }) => (
    <div className="bg-cafe-card rounded-xl border border-cafe-border p-5">
      <h2 className="text-base font-semibold text-cafe-text mb-4">{titulo}</h2>
      {lineas.length === 0 ? (
        <p className="text-sm text-cafe-muted">Sin citas completadas en este periodo.</p>
      ) : (
        <ul className="divide-y divide-cafe-border">
          {lineas.map((l) => (
            <li key={l.nombre} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-cafe-text truncate">{l.nombre}</p>
                <p className="text-xs text-cafe-subtle">
                  {l.citas} {l.citas === 1 ? etiqueta : `${etiqueta}s`}
                  {l.sinPrecio > 0 && ` · ${l.sinPrecio} sin precio`}
                </p>
              </div>
              <span className="text-sm font-semibold text-cafe-goldlight tabular-nums shrink-0">
                {pesos(l.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-4 md:px-6 py-4 flex items-center gap-3 sticky top-14 md:top-0 z-10 mt-14 md:mt-0">
          <div className="w-9 h-9 bg-cafe-gold/15 rounded-lg flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-cafe-goldlight" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-display font-medium text-cafe-text leading-tight">Cierre</h1>
            <p className="text-xs text-cafe-subtle">Cuánto se facturó, quién lo produjo y qué le toca a cada uno</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-3xl space-y-5">
          {datos?.soloMias && (
            <p className="text-xs text-cafe-goldlight bg-cafe-gold/10 border border-cafe-gold/20 rounded-xl px-4 py-3 leading-relaxed">
              Tu cuenta está vinculada a un barbero, así que este cierre es solo de tus citas. Para el consolidado
              del local, consulta con quien administra.
            </p>
          )}
          <div className="bg-cafe-card rounded-xl border border-cafe-border p-4 flex flex-wrap items-center gap-2">
            {RANGOS.map((r) => {
              const activo = desde === r.desde() && hasta === r.hasta();
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setDesde(r.desde());
                    setHasta(r.hasta());
                  }}
                  aria-pressed={activo}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold transition ${
                    activo
                      ? 'bg-cafe-gold text-cafe-bg'
                      : 'bg-cafe-soft text-cafe-muted border border-cafe-border hover:text-cafe-text'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              <input
                type="date"
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
                aria-label="Desde"
                className="flex-1 min-w-0 text-xs bg-cafe-soft border border-cafe-border rounded-lg px-2.5 py-2 text-cafe-text [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
              />
              <span className="text-xs text-cafe-subtle shrink-0">a</span>
              <input
                type="date"
                value={hasta}
                min={desde}
                max={hoy()}
                onChange={(e) => setHasta(e.target.value)}
                aria-label="Hasta"
                className="flex-1 min-w-0 text-xs bg-cafe-soft border border-cafe-border rounded-lg px-2.5 py-2 text-cafe-text [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
              />
            </div>
          </div>

          {cargando ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
            </div>
          ) : !datos ? null : (
            <>
              <div className="bg-cafe-card rounded-xl border border-cafe-border p-6">
                <p className="text-xs text-cafe-subtle uppercase tracking-[0.18em]">Facturado</p>
                <p className="text-4xl font-display text-cafe-goldlight tabular-nums mt-1">
                  {pesos(datos.resumen.total)}
                </p>
                <p className="text-sm text-cafe-muted mt-1">
                  {datos.resumen.completadas} cita{datos.resumen.completadas === 1 ? '' : 's'} completada
                  {datos.resumen.completadas === 1 ? '' : 's'}
                  {datos.resumen.ticketPromedio > 0 && ` · ${pesos(datos.resumen.ticketPromedio)} de promedio`}
                </p>

                {/* Lo facturado no es lo que queda: con comisión hay que pagarle
                    su parte, y con paga puesto la producción es del barbero y el
                    local solo cobra la tarifa. Esta línea es la caja real. */}
                {!datos.soloMias && datos.resumen.total > 0 && (
                  <div className="mt-4 pt-4 border-t border-cafe-border flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span className="text-sm text-cafe-muted">
                      Queda para el local{' '}
                      <strong className="text-base text-cafe-text tabular-nums">
                        {pesos(datos.resumen.paraElLocal)}
                      </strong>
                    </span>
                    {datos.totalComisiones > 0 && (
                      <span className="text-xs text-cafe-subtle tabular-nums">
                        comisiones {pesos(datos.totalComisiones)}
                      </span>
                    )}
                    {datos.totalPuestos > 0 && (
                      <span className="text-xs text-cafe-subtle tabular-nums">
                        puestos cobrados {pesos(datos.totalPuestos)}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                  {[
                    { label: 'Canceladas', valor: datos.resumen.canceladas },
                    { label: 'Sobre la hora', valor: datos.resumen.cancelacionesTarde },
                    { label: 'Por atender', valor: datos.resumen.pendientes },
                  ].map((x) => (
                    <div key={x.label} className="bg-cafe-soft rounded-lg p-3">
                      <p className="text-xl font-display text-cafe-text tabular-nums">{x.valor}</p>
                      <p className="text-xs text-cafe-subtle">{x.label}</p>
                    </div>
                  ))}
                </div>

                {datos.resumen.sinPrecio > 0 && (
                  <p className="text-xs text-cafe-muted mt-4 leading-relaxed border-t border-cafe-border pt-4">
                    {datos.resumen.sinPrecio} cita{datos.resumen.sinPrecio === 1 ? '' : 's'} no suma
                    {datos.resumen.sinPrecio === 1 ? '' : 'n'} al total: se reservaron antes de que se guardara
                    el precio. No se estiman con el catálogo actual porque daría una cifra que cambiaría cada
                    vez que ajustes precios.
                  </p>
                )}
              </div>

              <div className="bg-cafe-card rounded-xl border border-cafe-border p-5">
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h2 className="text-base font-semibold text-cafe-text">
                    {datos.soloMias ? 'Tus cuentas' : 'Por barbero'}
                  </h2>
                  {!datos.soloMias && datos.totalComisiones > 0 && (
                    <span className="text-xs text-cafe-muted">
                      comisiones{' '}
                      <strong className="text-cafe-goldlight tabular-nums">{pesos(datos.totalComisiones)}</strong>
                    </span>
                  )}
                </div>
                {datos.porBarbero.length === 0 ? (
                  <p className="text-sm text-cafe-muted">Sin citas completadas en este periodo.</p>
                ) : (
                  <ul className="divide-y divide-cafe-border">
                    {datos.porBarbero.map((b) => (
                      <li key={b.nombre} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-cafe-text truncate">{b.nombre}</p>
                          <p className="text-xs text-cafe-subtle">
                            {b.citas} {b.citas === 1 ? 'cita' : 'citas'} · produjo {pesos(b.total)}
                            {b.sinPrecio > 0 && ` · ${b.sinPrecio} sin precio`}
                          </p>
                          {b.modalidad === 'puesto' && (
                            <p className="text-xs text-cafe-subtle mt-0.5 tabular-nums">
                              {b.diasTrabajados} día{b.diasTrabajados === 1 ? '' : 's'} × {pesos(b.tarifaDiaria)} ={' '}
                              <span className="text-cafe-muted">−{pesos(b.debeAlLocal)}</span> de puesto
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {b.modalidad === 'puesto' ? (
                            <>
                              {/* Con paga puesto lo que produjo es suyo: lo que
                                  se muestra es lo que le queda después del puesto. */}
                              <p
                                className={`text-sm font-semibold tabular-nums ${
                                  b.neto < 0 ? 'text-red-400' : 'text-cafe-goldlight'
                                }`}
                              >
                                {pesos(b.neto)}
                              </p>
                              <p className="text-xs text-cafe-subtle">le queda</p>
                            </>
                          ) : b.porcentaje > 0 ? (
                            <>
                              <p className="text-sm font-semibold text-cafe-goldlight tabular-nums">
                                {pesos(b.leToca)}
                              </p>
                              <p className="text-xs text-cafe-subtle tabular-nums">{b.porcentaje}%</p>
                            </>
                          ) : (
                            <p className="text-xs text-cafe-subtle">a sueldo</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {datos.porBarbero.some((b) => b.modalidad === 'puesto' && b.neto < 0) && (
                  <p className="text-xs text-cafe-subtle mt-4 leading-relaxed border-t border-cafe-border pt-4">
                    En rojo: produjo menos de lo que cuesta el puesto en esos días. Vale revisar si alcanzó a
                    trabajar completo o si quedaron citas sin marcar como completadas.
                  </p>
                )}
              </div>
              <Tabla titulo="Por servicio" lineas={datos.porServicio} etiqueta="cita" />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={exportar}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-cafe-border text-cafe-text hover:border-cafe-gold transition"
                >
                  <Download className="w-4 h-4" />
                  Descargar para Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
