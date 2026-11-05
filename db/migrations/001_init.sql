-- 001 · Estructura inicial multi-barbería (migración desde Firestore)
-- Todas las tablas de negocio llevan tenant_id: los datos de una barbería
-- nunca quedan sin dueño ni se mezclan con los de otra.

-- ── Barberías ───────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificador público (subdominio / enlace). Puede cambiar; id no.
  slug               text NOT NULL UNIQUE
                     CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  name               text NOT NULL DEFAULT '',
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('draft', 'active', 'suspended')),
  -- Datos de presentación (logo, colores, eslogan…) sin estructura fija aún
  profile            jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- NULL = la barbería nunca guardó su catálogo (se usa el catálogo por defecto
  -- en la barbería principal; una barbería nueva queda sin servicios y cerrada)
  catalog_updated_at timestamptz,
  catalog_updated_by text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Configuración del negocio ───────────────────────────────────────────────
CREATE TABLE tenant_settings (
  tenant_id     uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  salon_name    text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  address       text NOT NULL DEFAULT '',
  city          text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  instagram     text NOT NULL DEFAULT '',
  facebook      text NOT NULL DEFAULT '',
  whatsapp      text NOT NULL DEFAULT '',
  notify_client boolean NOT NULL DEFAULT true,
  notify_admin  boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Catálogo: servicios ─────────────────────────────────────────────────────
CREATE TABLE services (
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Código estable del servicio (p. ej. "corte-barba"); las citas lo referencian
  id           text NOT NULL CHECK (id ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  name         text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description  text NOT NULL DEFAULT '' CHECK (char_length(description) <= 200),
  duration_min integer NOT NULL CHECK (duration_min BETWEEN 5 AND 480 AND duration_min % 5 = 0),
  price        integer NOT NULL CHECK (price BETWEEN 0 AND 10000000),
  active       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, id)
);

-- ── Catálogo: horario general por día (0 = domingo … 6 = sábado) ───────────
CREATE TABLE working_hours (
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  weekday    smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  open_time  time NOT NULL,
  close_time time NOT NULL,
  closed     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (tenant_id, weekday),
  CHECK (closed OR open_time < close_time)
);

-- ── Citas ───────────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  -- Texto para conservar los IDs de Firestore (los enlaces de cancelación ya
  -- enviados los contienen). Las citas nuevas reciben un id aleatorio.
  id                     text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  tenant_id              uuid NOT NULL REFERENCES tenants(id),
  service_id             text NOT NULL,
  service_name           text NOT NULL,
  client_name            text NOT NULL,
  client_email           text NOT NULL,
  client_whatsapp        text NOT NULL,
  notes                  text,
  -- Fecha y hora locales del negocio (hora de Colombia)
  date                   date NOT NULL,
  time                   time NOT NULL,
  status                 text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  group_id               text,
  habeas_data_accepted   boolean NOT NULL DEFAULT false,
  notifications_accepted boolean NOT NULL DEFAULT false,
  reminder_sent_at       timestamptz,
  cancelled_at           timestamptz,
  cancelled_by           text,
  late_cancel            boolean,
  source                 text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_tenant_date ON appointments (tenant_id, date);
CREATE INDEX appointments_tenant_group ON appointments (tenant_id, group_id) WHERE group_id IS NOT NULL;
CREATE INDEX appointments_tenant_created ON appointments (tenant_id, created_at DESC);
-- La base impide dos citas activas en el mismo horario de una barbería,
-- incluso si dos clientes confirman en el mismo instante.
CREATE UNIQUE INDEX appointments_one_active_per_slot
  ON appointments (tenant_id, date, time)
  WHERE status IN ('pending', 'confirmed');

-- ── Horarios bloqueados por el negocio ──────────────────────────────────────
CREATE TABLE blocked_slots (
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date       date NOT NULL,
  time       time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, date, time)
);

-- ── Administradores de cada barbería ────────────────────────────────────────
CREATE TABLE admins (
  -- Texto para conservar el UID de Firebase de los admins migrados
  id            text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         text NOT NULL CHECK (email = lower(email) AND position('@' in email) > 1),
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  -- NULL hasta que el admin crea su contraseña desde el enlace del correo
  password_hash text,
  invited       boolean NOT NULL DEFAULT false,
  created_by    text,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

-- ── Enlaces para crear / restablecer contraseña ─────────────────────────────
CREATE TABLE password_tokens (
  -- Solo se guarda el hash del token; el token en claro viaja únicamente en el correo
  token_hash text PRIMARY KEY,
  admin_id   text NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  purpose    text NOT NULL CHECK (purpose IN ('setup', 'reset')),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_tokens_admin ON password_tokens (admin_id);
