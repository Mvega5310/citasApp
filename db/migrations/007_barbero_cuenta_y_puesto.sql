-- 007 · La cuenta sabe qué barbero es, y el barbero cómo paga
--
-- Dos cosas que faltaban para el local informal: tres colegas que comparten
-- arriendo, cada uno con lo suyo.
--
-- 1) `admins.barber_id`: hasta ahora una cuenta del panel no estaba asociada a
--    ningún barbero, así que cualquiera que entrara veía las citas de los
--    tres. Con el vínculo, el servidor filtra a lo suyo. Entre colegas que
--    solo comparten el local, la agenda del otro no es asunto de nadie.
--
-- 2) Modalidad de pago. Son dos modelos opuestos y excluyentes:
--      comision → lo que produce es del local, que le paga un %
--      puesto   → lo que produce es SUYO, y le paga al local una tarifa diaria
--    Mezclarlos da cifras sin sentido: con "puesto", sumar su producción a la
--    caja del local sería contar dinero que no le pertenece.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS barber_id text;

ALTER TABLE admins
  ADD CONSTRAINT admins_barber_fk
  FOREIGN KEY (tenant_id, barber_id) REFERENCES barbers (tenant_id, id) ON DELETE SET NULL;

-- Un barbero no puede estar vinculado a dos cuentas: haría ambiguo el filtrado.
CREATE UNIQUE INDEX IF NOT EXISTS admins_un_barbero_una_cuenta
  ON admins (tenant_id, barber_id) WHERE barber_id IS NOT NULL;

ALTER TABLE barbers ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'comision'
  CHECK (modalidad IN ('comision', 'puesto'));

-- Tarifa diaria del puesto, en pesos. Solo cuenta con modalidad 'puesto'.
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS tarifa_diaria integer NOT NULL DEFAULT 0
  CHECK (tarifa_diaria BETWEEN 0 AND 10000000);
