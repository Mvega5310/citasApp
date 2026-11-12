-- 008 · Abono para confirmar la cita
--
-- La inasistencia es el costo real de una barbería: el hueco ya no se llena y
-- nadie responde por él. Pedir un abono por adelantado es lo que hacen los
-- software con los que esta app compite.
--
-- Aquí NO hay pasarela de pago, y es a propósito: el público son barberos
-- informales de barrio, que ya cobran por Nequi o Daviplata. Integrar una
-- pasarela les cobraría una comisión por cada cita y les exigiría papeles que
-- muchos no tienen. El flujo es el que ya usan: el cliente transfiere y manda
-- el comprobante, y la barbería confirma a mano en el panel.
--
-- Por eso no se guarda ningún estado de pago: la cita ya nace 'pending' y pasa
-- a 'confirmed' cuando la barbería la confirma. Inventar un estado "abonado"
-- que nadie puede verificar automáticamente sería mentirle al panel.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS deposito_activo boolean NOT NULL DEFAULT false;

-- Qué parte del precio se pide por adelantado. 50 % es lo habitual, pero cada
-- local decide; 100 significa pagar todo al reservar.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS deposito_porcentaje integer NOT NULL DEFAULT 50
  CHECK (deposito_porcentaje BETWEEN 1 AND 100);

-- A dónde transfiere el cliente, tal como lo escriba la barbería:
-- "Nequi 300 123 4567", "Daviplata 310 ...", "Bancolombia ahorros 123-456".
-- Texto libre a propósito: cada local cobra por donde puede, y una lista
-- cerrada de bancos envejecería mal.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS deposito_medio text NOT NULL DEFAULT '';
