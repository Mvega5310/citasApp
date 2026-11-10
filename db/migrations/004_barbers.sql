-- 004 · Barberos
--
-- Un local tiene de 2 a 6 puestos. El horario sigue siendo del local (la tabla
-- working_hours no cambia); lo que cambia es cuántas citas caben a la vez y
-- con quién.

CREATE TABLE barbers (
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Código estable dentro de la barbería (p. ej. "andres"); las citas lo referencian
  id         text NOT NULL CHECK (id ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  name       text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  active     boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- Las citas que ya existen se quedan sin barbero (NULL): son de antes de que
-- esto existiera y no hay a quién atribuirlas.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS barber_id text;

-- Un barbero solo puede borrarse si no tiene citas: ON DELETE RESTRICT evita
-- que al quitar a alguien del equipo se pierda el histórico de sus citas.
ALTER TABLE appointments
  ADD CONSTRAINT appointments_barber_fk
  FOREIGN KEY (tenant_id, barber_id) REFERENCES barbers (tenant_id, id) ON DELETE RESTRICT;

CREATE INDEX appointments_tenant_barber_date ON appointments (tenant_id, barber_id, date)
  WHERE barber_id IS NOT NULL;

-- ── El índice de doble reserva, ahora por barbero ───────────────────────────
--
-- El anterior era (tenant_id, date, time): una cita activa por horario y
-- barbería. Añadir barber_id a secas NO sirve: Postgres considera los nulos
-- distintos entre sí, así que dos citas sin barbero en el mismo horario
-- pasarían las dos, y una barbería que todavía no haya configurado barberos
-- perdería la protección que hoy tiene.
--
-- Con el centinela '' las citas sin barbero siguen compitiendo entre ellas
-- exactamente como antes, y las que sí lo tienen compiten solo con las del
-- mismo barbero.
DROP INDEX IF EXISTS appointments_one_active_per_slot;

CREATE UNIQUE INDEX appointments_one_active_per_slot
  ON appointments (tenant_id, date, time, COALESCE(barber_id, ''))
  WHERE status IN ('pending', 'confirmed');
