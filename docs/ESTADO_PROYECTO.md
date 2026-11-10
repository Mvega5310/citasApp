# Estado del proyecto — Marcos BarberShop / BeautyTurno

> Documento de traspaso entre sesiones de trabajo. Actualizado: 10 nov 2026.
> **En producción en Railway**: https://citas.proyects.store
> Rama de trabajo: `develop`. A `main` solo por avance directo desde `develop` (Railway publica desde `main`).

## Reglas para trabajar en este repo

- **Responder siempre en español** al dueño del proyecto (Marcos).
- **No correr `npm run build` mientras `npm run dev` está activo**: rompe `.next` y la página queda sin estilos.
- **Todo el trabajo va a `develop`**, y de ahí a `main`. No se trabaja directamente sobre `main`.
- Unir a `main` **despliega a producción** y aplica las migraciones pendientes: hazlo a sabiendas.
- Prettier, si se usa: `--single-quote --print-width 110`. Mejor no reformatear archivos enteros.
- Nunca pegar claves en el chat ni en commits (`.env.local` está ignorado).

## Qué es

App de reservas de citas para barberías (Next.js 14 App Router + TypeScript + Tailwind, paleta café/dorado).
Barbería principal: **Marcos BarberShop** (tenant por defecto `demo`). Pensada como plataforma multi-barbería:
cada barbería en su subdominio.

## Ramas

Solo quedan dos. Las de trabajo viejas (`feature/multi-tenant-restructure`, `redisenio-beautyturno`)
se borraron una vez contenidas en `main`.

| Rama | Contenido |
|---|---|
| `main` | Lo que corre en producción. Railway publica desde aquí. |
| `develop` | Donde se trabaja. Se une a `main` por avance directo cuando está probado. |

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
- `db/migrations/003_platform_admin.sql`: marca `platform_admin` en `admins` (ver punto 10).
- `db/migrations/004_barbers.sql`: tabla `barbers` y `barber_id` en las citas (ver punto 11).
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
- Copia definitiva hecha el 10 nov 2026: 550 citas, 532 bloqueos, 7 servicios, 2 admins, con
  `db:compare` confirmando la equivalencia contra la base real.

### 6. Correo
- **Resend** (API HTTP) si hay `RESEND_API_KEY`; si no, SMTP. En Railway Hobby el SMTP está bloqueado → Resend.
- Dominio verificado: **`mail.proyects.store`** (no el raíz: ya tenía la configuración de otro
  proyecto que sigue enviando, y un nombre solo admite un CNAME). Remitente `citas@mail.proyects.store`.
- **La suite de pruebas captura los correos por SMTP simulado**: con `RESEND_API_KEY` en `.env.local`
  fallan 13. Coméntala para correr `test:tenants`.
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

### 10. Operador de la plataforma (crear barberías)

- **Es una capacidad, no un rol.** `admins.platform_admin` va aparte de `role` porque los dos
  mapeadores hacen `role === 'admin' ? 'admin' : 'viewer'` (un rol nuevo se degradaría en silencio)
  y porque `role` es el papel *dentro* de una barbería: como tercer rol, el dueño de la plataforma
  perdería los permisos sobre su propio negocio.
- **No da acceso a los datos de otras barberías.** `authorizePlatformAdmin` se apoya en
  `authorizeAdmin`, que sigue atando la sesión a su barbería. Lo único que habilita es dar de alta.
- La marca se revalida **contra la base** en cada petición, no solo contra el token: retirarla corta
  el acceso en el acto, sin esperar a que caduque la sesión.
- `POST/GET /api/admin/tenants` y la pantalla `/admin/barberias`, visible solo con la marca.
- Al crear: valida el formato del slug, rechaza una lista de nombres reservados (`www`, `api`,
  `admin`, `send`…), exige nombre —es lo que ven los clientes hasta que la barbería lo cambie— y
  envía al admin nuevo su enlace para crear contraseña, apuntando a **su** subdominio.
- **El primer operador se otorga por consola**: `npm run platform:grant -- correo@ejemplo.com`
  (`--quitar` para retirarla, `--listar` para verlos). No puede salir del panel, porque para entrar
  al panel de plataforma ya hay que serlo.

### 11. Barberos

- El **horario es del local** (`working_hours`, sin cambios). Los barberos solo determinan cuántas
  citas caben a la vez y con quién.
- El cliente elige **primero la hora y después el barbero**: así no hay que recargar los horarios al
  cambiar de barbero, y solo se ofrece quien tiene libre esa franja
  (`GET /api/bookings/barbers?date&time`).
- **El índice de doble reserva es lo delicado.** Pasó de `(tenant_id, date, time)` a incluir
  `COALESCE(barber_id, '')`. Añadir `barber_id` a secas no sirve: Postgres trata los nulos como
  distintos, así que dos citas sin barbero habrían pasado las dos y una barbería sin barberos
  configurados habría perdido la protección. Con el centinela, las citas sin barbero siguen
  compitiendo entre ellas igual que antes.
- `resolverBarbero` (`lib/server/barbers.ts`) cubre los tres casos: sin equipo la cita queda sin
  asignar; con barbero pedido se valida que exista, esté activo y tenga la franja libre; y en
  "cualquiera disponible" gana el que **menos citas tiene ese día**, para repartir la carga. Si la
  base rechaza al elegido porque alguien se adelantó, se reintenta con el siguiente.
- La llave foránea es **RESTRICT**: quitar a un barbero con citas borraría su histórico. El panel
  avisa y sugiere marcarlo inactivo, que lo saca del selector sin perder nada.
- Las 550 citas migradas quedan **sin barbero** (son anteriores a esto) y aparecen sin asignar.

### 12. Detalles de interfaz resueltos

- **Logo**: `/api/logo` renderizaba un JPEG de 1,78 MB con ImageResponse en edge y devolvía un PNG de
  559 bytes — un cuadro en blanco en el encabezado, el panel y la pantalla de inicio. Ahora sirve
  PNG comiteados en `public/icons/`. El manifest apunta a los estáticos y hay `apple-touch-icon`,
  que iOS necesita porque no lee los iconos del manifest.
- **Menú móvil**: el cajón era `z-30` y la barra inferior `z-40`, así que la barra tapaba el perfil y
  Configuración. El cajón pasó a `z-50` y la barra superior a `z-[60]`.
- **Listado del panel**: paginado de 20 en 20 (eran 528 filas pintadas de una vez). La paginación es
  **en pantalla**: la petición sigue trayendo todas las citas. Llevarla al servidor exige mover allá
  los filtros de estado y fecha.
- **Configuración**: fila de accesos rápidos arriba, porque el código QR quedaba al final.
- **Código QR** (`/api/qr`): la dirección la arma el servidor; la ruta **no acepta una URL por
  parámetro**, que sería un generador de QR alojado en el dominio propio.

## Pruebas

- `npm test` — unitarias (incluye Resend con `fetch` simulado). Pasan.
- `npm run test:tenants` — aislamiento entre barberías con el emulador de Firestore.
- `npm run test:tenants -- --postgres` — lo mismo contra `citas_test` en Railway (necesita `RAILWAY_DATABASE_URL`).
  Son **93 comprobaciones**. Ojo: la suite captura los correos por SMTP simulado, así que **con
  `RESEND_API_KEY` en `.env.local` fallan 13** (las de correo, y las de login que dependen del
  enlace que viaja en el correo). No es un fallo del código: coméntala para correr las pruebas.

## Decisiones tomadas

- Todo a **Railway** (app + Postgres). Vercel se apaga después del cambio.
- Firebase está inactivo por cobros: solo se usa para leer y copiar los datos.
- Recordatorio: **10 minutos antes**.
- Railway publica desde **`main`**.
- Plan Railway: **Hobby** (sin SMTP saliente).
- Dominio propio: **`proyects.store`** (GoDaddy). Propuesto: app en `citas.proyects.store`,
  barberías nuevas en `{barbería}.citas.proyects.store`, remitente `citas@proyects.store` (confirmar con Marcos).
- Rol `viewer` = barbero (conserva sus permisos actuales).

## El corte a Railway: HECHO (10 nov 2026)

La app corre en **Railway + Postgres**, en `https://citas.proyects.store`. Lo ejecutado:

- Resend verificado en **`mail.proyects.store`** (subdominio aparte: el dominio raíz ya tenía la
  configuración de otro proyecto que sigue enviando, y un nombre solo admite un CNAME).
  Remitente `citas@mail.proyects.store`, región `sa-east-1`.
- 14 variables en el servicio `citasApp` (proyecto Railway **`valiant-clarity`**), con
  `DATABASE_URL=${{Postgres.DATABASE_URL}}` por referencia y `PORT=3000`.
- Dominio `citas.proyects.store` + **comodín `*.citas.proyects.store`** con certificado: una
  barbería nueva funciona al instante sin tocar DNS.
- Copia definitiva: 550 citas, 532 bloqueos, 7 servicios, 2 admins. `db:compare` confirmó la
  equivalencia contra la base real.
- **Vercel quedó como redirect 307** a `citas.proyects.store`, no apagado: los clientes entran por
  una URL de Vercel y apagarlo dejaría colgados los enlaces repartidos. El redirect es además lo que
  congeló Firestore en el momento exacto de la copia.
- Servicio `recordatorios`: cron `*/5 * * * *`, `restartPolicyType NEVER`,
  `CRON_SECRET=${{citasApp.CRON_SECRET}}` por referencia.

**El config-as-code por archivo está deprecado en Railway**: `railway.json` y `railway.cron.json`
nunca se leyeron. El `preDeployCommand` y la configuración del cron están puestos **directamente en
cada servicio**, y de ahí en adelante las migraciones corren solas antes de cada publicación.
Ojo: un *redeploy* reutiliza la instantánea anterior y no toma los cambios de configuración; hace
falta un despliegue nuevo.

## Falta

**Pendiente de Marcos:**
1. Probar de punta a punta: reservar, cancelar, recordatorio.
2. Rotar lo que quedó expuesto en el chat: llave del service account de Firebase (ya se puede, la
   copia terminó), contraseña de Postgres, y revocar la contraseña de aplicación de Gmail, que ya no
   se usa.
3. Quitar el proxy TCP público de Postgres y vaciar `citas_test`. **Déjalo para el final**: es el
   único acceso a la base desde fuera de Railway.

**Pendiente de construir:**
- **Modo claro.** Toda la interfaz está sobre tokens `cafe-*` oscuros por definición, en 17
  archivos. Hacerlo bien es convertirlos en variables que cambien según el tema, no duplicar clases.
- **Borrar barberías** desde el panel de plataforma: hoy solo se pueden crear y listar.
- **Título y metadatos por barbería**: `app/layout.tsx` los tiene fijos. Arreglarlo obliga a volver
  dinámico ese layout, y eso convierte 11 páginas estáticas en dinámicas — decisión de rendimiento
  aparte.
- **Paginación en el servidor** del listado de citas (hoy es solo en pantalla).

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
