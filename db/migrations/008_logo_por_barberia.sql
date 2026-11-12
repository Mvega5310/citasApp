-- 008 · El logo es de cada barbería
--
-- `/api/logo` servía un PNG fijo de `public/icons/`, así que el logo de Marcos
-- BarberShop salía en TODAS las barberías de la plataforma: encabezado del
-- cliente, panel, login, favicon, pantalla de contraseña y los dos manifests.
-- Es el mismo error que tenían los metadatos, pero con la imagen.
--
-- Va en su propia tabla y no en `tenant_settings` a propósito: la
-- configuración se lee en cada página, y arrastrar ~100 KB de imagen en cada
-- una de esas lecturas sería pagar el peso del logo también donde no se pinta.

CREATE TABLE IF NOT EXISTS tenant_logos (
  tenant_id  uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  -- PNG cuadrado, ya redimensionado por el navegador antes de subirlo.
  png        bytea NOT NULL,
  -- Para el ETag: así el navegador revalida barato y el cambio de logo se ve
  -- sin esperar a que caduque la caché.
  updated_at timestamptz NOT NULL DEFAULT now()
);
