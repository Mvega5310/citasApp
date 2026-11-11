-- 006 · Porcentaje de cada barbero
--
-- Muchas barberías pagan a porcentaje: el barbero se queda con un % de lo que
-- produce. Con el precio ya guardado en la cita (migración 005), lo único que
-- falta para el corte de cuentas es saber qué porcentaje le toca a cada uno.
--
-- Va en `barbers` y no en la cita, a diferencia del precio. El precio es un
-- hecho del momento de la reserva; el porcentaje es un acuerdo laboral
-- vigente, y así es como lo piensa el negocio: "a Andrés le pago el 50%". Si
-- el acuerdo cambia, cambia para el corte que viene — el panel avisa de que
-- recalcular periodos ya pagados dará otra cifra.
--
-- 0 por defecto: quien trabaja a sueldo no tiene porcentaje, y es más seguro
-- que el informe muestre cero a que invente un 50% que nadie acordó.

ALTER TABLE barbers ADD COLUMN IF NOT EXISTS commission integer NOT NULL DEFAULT 0
  CHECK (commission BETWEEN 0 AND 100);
