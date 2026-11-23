-- 011 · Clientes bloqueados
--
-- Alguien aparta una cita y no llega. Sin cuentas de cliente, "bloquear" es
-- una barrera de fricción -una lista de correos que ya no pueden reservar
-- solos- y no un control de seguridad real: nada impide volver con otro
-- correo. Para una barbería informal basta: desalienta, y obliga a hablar
-- con quien administra antes de agendar de nuevo.
--
-- No toca `appointments`: el adicional (ver lib/server/data/types.ts,
-- ManualAppointment) reutiliza la columna `source`, que existía sin uso desde
-- la migración 001.

CREATE TABLE IF NOT EXISTS blocked_clients (
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Mismo formato que appointments.client_email: minúsculas, sin espacios.
  email      text NOT NULL,
  reason     text NOT NULL DEFAULT '',
  blocked_by text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, email)
);
