-- 012 · QR de cobro: del negocio y de cada barbero
--
-- La pasarela de pago cobra comisión alta para un local informal (ver nota en
-- ESTADO_PROYECTO.md sobre Wompi). La alternativa es la que ya usan a mano:
-- Nequi o Daviplata directo. Esto solo guarda la IMAGEN del QR -mismo patrón
-- que el logo, migración 008- para que cada barbero pueda mostrar el suyo sin
-- que la app toque, vea ni procese un pago real.
--
-- Dos tablas y no una polimórfica: el QR del negocio se lee en un solo lugar
-- (el respaldo cuando un barbero no subió el suyo), el de cada barbero se
-- consulta por su id. Separarlas evita un "tipo + id" genérico que obligaría
-- a validar en código qué combinaciones tienen sentido.

CREATE TABLE IF NOT EXISTS tenant_payment_qrs (
  tenant_id  uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  png        bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barber_payment_qrs (
  tenant_id  uuid NOT NULL,
  barber_id  text NOT NULL,
  png        bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, barber_id),
  -- Mismo ancla que admins_barber_fk (migración 007): borrar al barbero
  -- borra su QR, no deja un huérfano apuntando a nadie.
  FOREIGN KEY (tenant_id, barber_id) REFERENCES barbers (tenant_id, id) ON DELETE CASCADE
);
