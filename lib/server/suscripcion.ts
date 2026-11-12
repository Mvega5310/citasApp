/**
 * En qué va el plan de una barbería.
 *
 * El estado **se deduce de las fechas, no se guarda**. Una columna que dijera
 * 'activa' se volvería mentira sola el día que venciera, y nadie va a estar
 * mirando ese día; deducirlo no puede quedar desactualizado nunca.
 *
 * Aquí no se cobra nada ni se corta nada: esto informa. Suspender una
 * barbería sigue siendo una decisión manual (`tenants.status`), porque una
 * con citas reservadas para el sábado no puede quedarse sin panel un
 * miércoles por una mensualidad.
 */

/** Días después del vencimiento en los que todo sigue igual, solo se avisa. */
export const DIAS_DE_GRACIA = 8;

/** Días antes del vencimiento en los que ya conviene avisar. */
export const DIAS_DE_AVISO = 7;

export type Plan = {
  /** Hasta cuándo está cubierta (YYYY-MM-DD). null = sin plazo. */
  hasta: string | null;
  /** Lo que acordó pagar al mes. 0 = prueba o cortesía. */
  precio: number;
  /** Cómo paga, en texto libre. */
  nota: string;
};

export type EstadoPlan =
  | 'cortesia' // sin plazo: no se le cobra y no vence
  | 'prueba' // dentro del plazo y sin precio acordado
  | 'al_dia' // dentro del plazo y pagando
  | 'por_vencer' // le quedan pocos días
  | 'gracia' // ya venció, pero dentro del margen
  | 'vencida'; // venció y pasó el margen

export type Suscripcion = {
  estado: EstadoPlan;
  /** Días que faltan para vencer. Negativo si ya venció. null si no vence. */
  diasRestantes: number | null;
  plan: Plan;
};

/** Diferencia en días entre dos fechas YYYY-MM-DD, contando días de calendario. */
function diasEntre(desde: string, hasta: string): number {
  // Se comparan a mediodía UTC para que el cambio de horario no mueva el
  // resultado un día arriba o abajo.
  const a = Date.parse(`${desde}T12:00:00Z`);
  const b = Date.parse(`${hasta}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function estadoDelPlan(plan: Plan, hoy = hoyISO()): Suscripcion {
  if (!plan.hasta) {
    return { estado: 'cortesia', diasRestantes: null, plan };
  }

  const diasRestantes = diasEntre(hoy, plan.hasta);

  if (diasRestantes < -DIAS_DE_GRACIA) return { estado: 'vencida', diasRestantes, plan };
  if (diasRestantes < 0) return { estado: 'gracia', diasRestantes, plan };
  if (diasRestantes <= DIAS_DE_AVISO) return { estado: 'por_vencer', diasRestantes, plan };
  // Sin precio acordado es una prueba, no una suscripción al día.
  return { estado: plan.precio > 0 ? 'al_dia' : 'prueba', diasRestantes, plan };
}

/** Etiqueta corta para el panel de plataforma. */
export const ETIQUETA_ESTADO: Record<EstadoPlan, string> = {
  cortesia: 'Cortesía',
  prueba: 'En prueba',
  al_dia: 'Al día',
  por_vencer: 'Por vencer',
  gracia: 'Vencida (en gracia)',
  vencida: 'Vencida',
};

/** Suma meses a una fecha YYYY-MM-DD, para renovar sin pelear con el calendario. */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  // Día 0 del mes siguiente = último día del mes buscado. Así un plan que
  // vence el 31 de enero y se renueva un mes cae el 28/29 de febrero, en vez
  // de saltar al 2 o 3 de marzo.
  const ultimoDia = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  const destino = new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimoDia)));
  return destino.toISOString().slice(0, 10);
}
