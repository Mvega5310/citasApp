-- 003 · Operador de la plataforma (crear barberías)
--
-- Va como columna aparte y no como un tercer valor de `role` a propósito:
--
-- 1. Los mapeadores de ambos backends hacen `role === 'admin' ? 'admin' :
--    'viewer'`, así que un rol nuevo se degradaría a viewer en silencio.
-- 2. `role` es el papel DENTRO de una barbería (quién edita servicios, quién
--    solo mira). Operar la plataforma es otra cosa, perpendicular: quien crea
--    barberías es a la vez admin de la suya. Como tercer rol, el dueño de la
--    plataforma perdería los permisos sobre su propio negocio.
--
-- El admin sigue perteneciendo a una barbería (tenant_id NOT NULL): el
-- aislamiento no se toca. Esta marca solo habilita crear barberías nuevas,
-- NO leer los datos de las demás.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS platform_admin boolean NOT NULL DEFAULT false;

-- Al día de hoy no hay ninguno: se otorga con `npm run platform:grant`.
CREATE INDEX IF NOT EXISTS admins_platform ON admins (platform_admin) WHERE platform_admin;
