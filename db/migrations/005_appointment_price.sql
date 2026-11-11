-- 005 · El precio queda guardado en la cita
--
-- Hasta ahora la cita solo guardaba service_id y service_name. Para saber
-- cuánto se facturó había que cruzar con la tabla `services`, que es el
-- catálogo VIGENTE: el día que la barbería sube precios, cambiaría también lo
-- que facturó el mes pasado. Un informe de cierre que se reescribe solo no
-- sirve para cuadrar caja ni para pagarle un porcentaje a nadie.
--
-- Queda NULL en las citas anteriores: no hay forma de saber qué precio tenían
-- cuando se reservaron. El informe las cuenta aparte y lo dice, en vez de
-- inventar una cifra cruzándolas con el catálogo de hoy.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS price integer
  CHECK (price IS NULL OR price BETWEEN 0 AND 10000000);

-- Para sumar por periodo sin recorrer la tabla entera.
CREATE INDEX IF NOT EXISTS appointments_tenant_status_date
  ON appointments (tenant_id, status, date);
