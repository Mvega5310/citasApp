# Estado del proyecto — Marcos BarberShop / BeautyTurno

> Documento de traspaso entre sesiones de trabajo. Actualizado: 9 nov 2026.
> Rama de trabajo: `feature/multi-tenant-restructure` (ya en GitHub, **no** unida a `develop` ni a `main`).

## Reglas para trabajar en este repo

- **Responder siempre en español** al dueño del proyecto (Marcos).
- **No correr `npm run build` mientras `npm run dev` está activo**: rompe `.next` y la página queda sin estilos.
- Commits en la rama de trabajo; **no unir a `main` sin el plan del cambio** (ver abajo): Railway publica solo desde `main`.
- Prettier, si se usa: `--single-quote --print-width 110`. Mejor no reformatear archivos enteros.
- Nunca pegar claves en el chat ni en commits (`.env.local` está ignorado).

## Qué es

App de reservas de citas para barberías (Next.js 14 App Router + TypeScript + Tailwind, paleta café/dorado).
Barbería principal: **Marcos BarberShop** (tenant por defecto `demo`). Pensada como plataforma multi-barbería:
cada barbería en su subdominio.

## Ramas

| Rama | Contenido |
|---|---|
| `main` | Producción actual (Vercel + Firebase). Railway (`citasApp`) también publica desde aquí. |
| `develop` | Rediseño café/dorado (PR #1) — `main` + rediseño cliente y admin. |
| `feature/multi-tenant-restructure` | **Todo lo nuevo**: contiene `main` + 32 commits. Se une sin conflictos. |

## Hecho

### 1. Rediseño visual (en `develop`)
Sitio de clientes y panel admin con estilo editorial café/dorado (tokens `cafe.*` en Tailwind).

### 2. Multi-tenant (rama feature)
- La barbería sale del **subdominio** (`middleware.ts` → cabecera `x-tenant-slug`). `www` y el dominio raíz = `demo`.
- `lib/server/tenant.ts`: `resolveRequestTenant` (inactiva → 403, no existe → 404, timeout → 503; caché 60 s).
- `lib/server/authorization.ts`: `authorizeAdmin` — el admin solo actúa sobre su propia barbería.
- Catálogo (servicios + horario semanal) por barbería, editable en el panel (`/admin/servicios`, `/admin/horarios`).
- Configuración, correos y recordatorios por barbería. Cada barbería solo ve/recibe lo suyo.

### 3. Capa de datos única + Postgres
- `lib/server/data/` → `store()` elige backend con `DATA_BACKEND` (`firestore` por defecto | `postgres`).
- `lib/server/data/firestore.ts` (comportamiento anterior) y `lib/server/data/postgres.ts` (nuevo).
- Esquema: `db/migrations/001_init.sql`. Índice único impide dos citas activas en el mismo horario.
- `db/migrations/002_password_changed_at.sql`: marca `password_changed_at` en `admins` (ver punto 4).
- `npm run db:migrate` (base de la app) / `npm run db:migrate:test` (base `citas_test`).

### 4. Cuentas propias de admin (sin Firebase Auth)
- Contraseñas con scrypt; enlaces de un solo uso: crear contraseña (72 h) y restablecer (1 h).
- `/admin/password` (crear/cambiar), "¿Olvidaste tu contraseña?" en el login, límites de intentos.
- Los enlaces se construyen con `APP_URL` / `NEXT_PUBLIC_APP_DOMAIN`, nunca con el `Host` (evita robo de enlaces).
- Cambiar la contraseña **cierra las sesiones abiertas**: `authorizeAdmin` rechaza con 401 los tokens
  emitidos antes de `password_changed_at` (se comparan truncados a segundos, porque el `iat` del token
  viene en segundos). Si la consulta falla no se cierra la sesión: dejar fuera a un admin por una
  consulta fallida es peor. Con `DATA_BACKEND=firestore` el campo no existe y no invalida nada.

### 5. Copia Firestore → Postgres
- `npm run db:copy` (`--dry-run`, `--fresh`, `--target=app --yes`): solo lee Firestore; todo en una transacción.
- `npm run db:compare`: confirma que la app responde igual con ambos backends. **Equivalencia confirmada** con `citas_test`.
- Datos reales: 536 citas (326 + 210 antiguas en la colección raíz), 523 horarios bloqueados, 7 servicios, 2 admins.
- Los admins se copian **sin contraseña**: cada uno la crea con el correo del paso de cambio.
- La base real de Railway (`railway`) ya tiene el esquema pero **aún no los datos** (la copia final se hace el día del cambio).

### 6. Correo
- **Resend** (API HTTP) si hay `RESEND_API_KEY`; si no, SMTP. En Railway Hobby el SMTP está bloqueado → Resend.
- Cada correo sale **con el nombre de su barbería** desde la dirección de `EMAIL_FROM` (dominio verificado),
  con **Responder a = correo del negocio** (Marcos BarberShop: `marcosbarbershop89@gmail.com` vía `EMAIL_TO_DEFAULT`;
  otras barberías: el correo de contacto de su Configuración). Avisos al negocio → responder al cliente.
- Todo texto del usuario va escapado en el HTML de los correos.

### 7. Recordatorios
- 10 minutos antes de la cita (`lib/server/reminders.ts`, ventana [ahora, ahora+10 min], una sola vez por cita).
- En Railway, una tarea cada 5 min → el correo llega **entre 5 y 10 min antes**.
- `/api/cron/reminder` exige `Authorization: Bearer CRON_SECRET`; en producción sin clave rechaza todo.

### 8. Preparación del cambio a Railway
- `railway.json`: corre `npm run db:migrate` antes de cada publicación (`tsx` pasó a `dependencies`).
- `railway.cron.json` + `scripts/cron-reminder.mjs`: segundo servicio que llama a la app cada 5 min.
- `npm run admins:setup-emails`: vista previa por defecto; `--target=app --send --yes` envía el enlace de crear contraseña.
- `env.example` documenta todas las variables.

### 9. Acceso al panel desde el sitio de clientes
- Enlace **"🔒 Ingresar"** en el encabezado y **"Acceso para el negocio"** en el pie → `/admin`
  (con sesión va al panel, sin sesión al login). Los clientes siguen reservando **sin cuenta**.

## Pruebas

- `npm test` — unitarias (incluye Resend con `fetch` simulado). Pasan.
- `npm run test:tenants` — aislamiento entre barberías con el emulador de Firestore.
- `npm run test:tenants -- --postgres` — lo mismo contra `citas_test` en Railway (necesita `RAILWAY_DATABASE_URL`).

## Decisiones tomadas

- Todo a **Railway** (app + Postgres). Vercel se apaga después del cambio.
- Firebase está inactivo por cobros: solo se usa para leer y copiar los datos.
- Recordatorio: **10 minutos antes**.
- Railway publica desde **`main`**.
- Plan Railway: **Hobby** (sin SMTP saliente).
- Dominio propio: **`proyects.store`** (GoDaddy). Propuesto: app en `citas.proyects.store`,
  barberías nuevas en `{barbería}.citas.proyects.store`, remitente `citas@proyects.store` (confirmar con Marcos).
- Rol `viewer` = barbero (conserva sus permisos actuales).

## Falta — cambio a Railway (en este orden)

**Pendiente de Marcos:**
1. Resend: dominio `proyects.store` verificado (registros DNS en GoDaddy) y API key creada.
2. Dos claves aleatorias (`ADMIN_SECRET`, `CRON_SECRET`):
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Luego:**
3. Variables del servicio `citasApp` en Railway:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `DATA_BACKEND=postgres`, `ADMIN_SECRET`, `CRON_SECRET`,
   `APP_URL=https://citas.proyects.store`, `NEXT_PUBLIC_APP_DOMAIN=citas.proyects.store`,
   `NEXT_PUBLIC_DEFAULT_TENANT=demo`, `NEXT_PUBLIC_APP_NAME=Marcos BarberShop`, `RESEND_API_KEY`,
   `EMAIL_FROM=Marcos BarberShop <citas@proyects.store>`, `EMAIL_TO_DEFAULT=marcosbarbershop89@gmail.com`,
   `APP_ENV=production`. (Las de Firebase solo hacen falta para copiar desde el equipo local.)
4. Servicio nuevo de recordatorios (mismo repo, rama `main`): en Settings → *Config-as-code* usar
   `railway.cron.json`; variables `APP_URL` y `CRON_SECRET=${{citasApp.CRON_SECRET}}`.
5. Dominio `citas.proyects.store` en Railway + CNAME en GoDaddy.
6. Copia final de datos: `npm run db:copy -- --fresh --target=app --yes` y `npm run db:compare -- --target=app`.
7. Unir `feature/multi-tenant-restructure` → `develop` → `main` (Railway publica y migra).
8. `npm run admins:setup-emails -- --target=app` (revisar) y luego con `--send --yes`.
9. Probar reservar, cancelar, recordatorio, login de cada admin.
10. Cerrar: quitar el proxy TCP público de Postgres, vaciar `citas_test`, apagar Vercel.

## Después del cambio (backlog)

- **Barberos**: cada barbería con sus barberos; cada uno maneja su horario; el cliente elige barbero o
  "cualquiera disponible" según disponibilidad.
- Cuenta opcional de cliente (ver/cancelar sus citas, acceso por enlace al correo) — reservar sin cuenta debe seguir.
- Página pública o directorio de barberías; superadmin para crear barberías.
- Rediseñar `/cancelar/[token]` (aún con el estilo claro antiguo).

### Cerrado el 9 nov 2026 (auditoría previa al cambio)

- ~~El enlace de cancelación se arma con el `Host`~~ → ahora usa `appOrigin()`, igual que los de contraseña.
  Las dos rutas de reserva ya envolvían ese armado en `try/catch`, así que si faltara `APP_URL` la reserva
  sigue guardándose y solo se omite el enlace.
- ~~Cerrar sesiones abiertas al cambiar la contraseña~~ → migración 002 + verificación en `authorizeAdmin`.
- ~~`lib/shared/TenantContext.tsx` huérfano~~ → borrado (cero referencias).
- ~~`/api/email-test`~~ → borrada. Era una ruta de diagnóstico que enviaba correos reales.
- ~~`EMAIL_TO_DEFAULT` en `env.example`~~ → corregido a `marcosbarbershop89@gmail.com` (tenía el correo personal).
- ~~El cron no contaba las citas sin correo del cliente~~ → ahora suman a `skipped`.
