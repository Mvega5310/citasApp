-- 009 · Plan de cada barbería
--
-- No hay cobro ni pasarela: esto solo registra en qué va cada barbería, que
-- es lo que hace falta para una prueba de tres meses. Sin esto, al vencerse
-- el plazo no habría forma de saber a quién se le vence qué.
--
-- Importante: **el estado no se guarda, se deduce** de estas columnas (ver
-- `lib/server/suscripcion.ts`). Una columna que dijera 'activa' se volvería
-- mentira sola el día que venciera, y nadie estaría mirando ese día.
--
-- Tampoco toca `tenants.status`, que es el acceso (draft/active/suspended) y
-- sigue siendo una decisión manual. Vencerse no corta el servicio: una
-- barbería con citas reservadas para el sábado no puede quedarse sin panel un
-- miércoles por una mensualidad.

-- Hasta cuándo está cubierta. NULL = sin plazo (cortesía indefinida).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_hasta date;

-- Lo que acordó pagar al mes, en pesos. 0 = prueba o cortesía.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_precio integer NOT NULL DEFAULT 0
  CHECK (plan_precio BETWEEN 0 AND 10000000);

-- Cómo y cuándo paga, en texto libre ("Nequi el 5 de cada mes").
-- Libre a propósito: cada barbería paga por donde puede, y una lista cerrada
-- de medios envejecería mal.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_nota text NOT NULL DEFAULT '';
