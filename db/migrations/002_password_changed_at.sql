-- 002 · Cerrar las sesiones abiertas al cambiar la contraseña
--
-- Un token de sesión dura 7 días. Sin esta marca, un admin que cambia su
-- contraseña porque sospecha que alguien entró deja esa sesión ajena viva
-- hasta que expire. Guardando cuándo cambió la contraseña, se pueden rechazar
-- los tokens emitidos antes de ese momento.
--
-- Queda NULL en las cuentas existentes: un NULL no invalida nada, así que
-- aplicar esta migración no echa a nadie de su sesión.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
