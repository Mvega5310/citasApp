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

### 11.1 Ganancias por barbero: comisión o paga puesto

Nace del caso real de un local informal: tres colegas comparten el arriendo y cada uno maneja lo
suyo. **Todo esto es opcional** — por defecto nada cambia: `modalidad` nace en `comision` con 0 %,
`tarifa_diaria` en 0 y ninguna cuenta vinculada. Una barbería normal no se entera de que existe.

- **Dos modelos opuestos, nunca mezclados** (migración `007`):
  - `comision`: lo que produce es del local, que le paga `commission` %.
  - `puesto`: lo que produce es **suyo**, y le paga al local `tarifa_diaria` por día trabajado.

  Sumar la producción de alguien que paga puesto a la caja del local sería contar dinero que no le
  pertenece. Por eso Cierre separa **Facturado** (lo que entró por la puerta) de **Queda para el
  local** (lo que de verdad es del negocio una vez repartido). La pantalla de Barberos muestra solo
  el campo de la modalidad activa: ver el % y la tarifa juntos sugiere que se suman, y no se suman.
- **Días trabajados = fechas distintas con citas completadas.** Si no trabajó, ese día no se le
  cobra. Si el acuerdo entre ellos es cobrar igual aunque no venga, ese ajuste va por fuera: la app
  no inventa días que no ocurrieron. Un neto negativo (produjo menos que el puesto) sale en rojo con
  la explicación.
- **Cada barbero ve solo sus citas** (`admins.barber_id` → `lib/server/alcance.ts`). El filtrado es
  **del servidor contra la base**, no del token ni del navegador: filtrar en el cliente habría hecho
  viajar igual las citas de los compañeros, y bastaría abrir la consola para leerlas. Cubre las tres
  puertas — el listado, el informe y la cita individual por id (que responde **404**, no 403: decir
  "no es tuya" confirmaría que existe y de quién es).
- **Nadie cambia su propio vínculo**: si pudiera, un barbero se desvincularía solo y vería la agenda
  de los demás. Lo cambia otro administrador, desde Equipo. Un barbero tampoco puede estar vinculado
  a dos cuentas (índice único parcial), porque haría ambiguo el filtrado.
- La tarifa y el % **no salen al cliente**: el catálogo público solo expone `{id, name}` de los
  barberos activos.
- Igual que el %, las dos cifras son el acuerdo vigente y no se guardan por cita: cambiarlas hace que
  un periodo ya pagado muestre otro número al volver a consultarlo.

### 12. Detalles de interfaz resueltos

- **Logo**: `/api/logo` renderizaba un JPEG de 1,78 MB con ImageResponse en edge y devolvía un PNG de
  559 bytes — un cuadro en blanco en el encabezado, el panel y la pantalla de inicio. Ahora sirve
  PNG comiteados en `public/icons/`. El manifest apunta a los estáticos y hay `apple-touch-icon`,
  que iOS necesita porque no lee los iconos del manifest.
- **Menú móvil**: el cajón era `z-30` y la barra inferior `z-40`, así que la barra tapaba el perfil y
  Configuración. El cajón pasó a `z-50` y la barra superior a `z-[60]`.
- **Listado del panel**: paginado de 20 en 20 **en el servidor**. Antes la petición traía todas las
  citas (528 en la barbería con más histórico) y el navegador filtraba y paginaba; crecía sin techo,
  así que cuantas más citas acumulara un local, más lento abría su panel. Ahora el estado y la fecha
  se filtran en la base y solo bajan 20 filas. Detalles que no son obvios:
  - Las tarjetas de arriba (total, pendientes, confirmadas, completadas) resumen **toda** la
    barbería, no la página: el conteo por estado viene aparte, sin los filtros de pantalla.
  - Al cambiar un estado o borrar se recarga la página actual. Con un filtro puesto la cita puede
    dejar de pertenecer a la página, y al borrar una fila hay que subir otra desde la siguiente.
  - El filtro por barbero (cuentas vinculadas) va **dentro de la consulta**, no como recorte
    posterior, y acota también el resumen: ni los totales ajenos salen de la base.
  - Cambiar de página o de filtro **vacía la selección**: borrar en bloque filas que ya no se ven en
    pantalla es demasiado fácil de hacer sin querer.
  - El límite por página está topado en 100 en el servidor, para que nadie pida el histórico entero.
- **Nombre de cada barbería en los metadatos**: el layout raíz tenía "Marcos BarberShop" escrito a
  mano, así que toda barbería salía con ese nombre en la pestaña, al compartir el enlace y al
  instalar la app. Ahora sale de su configuración (`lib/server/marca.ts`). El manifest del panel era
  un archivo fijo en `public/` y además **nunca cargaba**: `/admin-manifest.json` empieza por
  `/admin`, así que el middleware lo mandaba al login, y el navegador lo pide sin cookies. Pasó a
  ser una ruta y está exento del guardia. Si la barbería no se puede resolver, los metadatos caen en
  "BeautyTurno" y nunca tumban la página: el 404 lo decide la página, no su título.
- **Pantalla de cancelación** (`/cancelar/[token]`): era la última en el tema claro antiguo —gris,
  blanco y emoji— y es la que ve el cliente al abrir el enlace de su correo. Pasó al café/dorado,
  con el sello y el nombre de **su** barbería, igual que la tirilla que recibió al reservar. En la
  confirmación, *conservar* va primero y en dorado, y *cancelar* queda como borde rojo: lo que no se
  puede deshacer no debe ser lo que se pulsa por descuido. Las pantallas de enlace inválido y de
  cita pasada **no** llevan nombre de barbería: si el enlace no se pudo verificar, no se sabe de
  quién es la cita y ponerlo sería inventarlo.
- **Logo por barbería** (migración `008`): `/api/logo` servía un PNG fijo de `public/icons/`, así
  que el logo de Marcos BarberShop salía en **todas** las barberías — encabezado del cliente, panel,
  login, favicon, pantalla de contraseña y los dos manifests. Ahora cada una sube el suyo desde
  Configuración.
  - Va en su propia tabla, no en `tenant_settings`: la configuración se lee en cada página y no
    tiene por qué arrastrar ~30 KB de imagen donde el logo no se pinta.
  - **El navegador redimensiona antes de subir** (recorte cuadrado al centro, 512×512 por canvas).
    No hay `sharp` en el proyecto —dependencia nativa— y no vale la pena añadirla solo para esto.
    Aun así el servidor revisa los bytes: firma PNG, IHDR, lado entre 64 y 512, cuadrado y 300 KB
    como tope. El `Content-Type` lo escribe quien sube, así que no se le cree.
  - **Sin logo propio sale un monograma con las iniciales**, no el PNG comiteado: para otra
    barbería ese archivo no es un respaldo, es el logo de otro negocio. El PNG sigue siendo el
    respaldo solo de la barbería por defecto, que es de quien es.
  - El monograma es SVG. Para el icono del manifest eso puede no renderizar en Android hasta que
    suban el suyo; es degradación aceptable y además empuja a subirlo.
  - ETag sobre `updated_at`: al cambiar el logo el navegador revalida barato en vez de quedarse con
    el viejo hasta que caduque la caché.
- **Plan de cada barbería** (migración `009`): registra hasta cuándo está cubierta, qué se acordó
  pagar y cómo paga. **No hay cobro ni pasarela**, y a propósito — ver "Descartado".
  - **El estado no se guarda, se deduce** (`lib/server/suscripcion.ts`). Una columna que dijera
    'activa' se volvería mentira sola el día que venciera, y nadie estaría mirando ese día. Los
    estados salen de las fechas: cortesía, en prueba, al día, por vencer, vencida (en gracia),
    vencida.
  - **Vencerse no suspende.** `tenants.status` sigue siendo una decisión manual y aparte: una
    barbería con citas reservadas para el sábado no puede quedarse sin panel un miércoles por una
    mensualidad. Hay 8 días de gracia y luego sale en rojo en el panel de plataforma, pero cortar
    lo decide una persona.
  - Renovar desde el vencimiento si sigue vigente, y desde hoy si ya venció: renovar tarde no
    regala los días de atraso, y renovar a tiempo tampoco los quita.
  - `sumarMeses` respeta el fin de mes (31 ene + 1 mes = 28 feb, o 29 en bisiesto), que es donde
    suele romperse este tipo de cuenta.
- **Diálogos por encima de la barra del móvil**: los modales estaban en `z-50` y la barra superior
  del panel es `z-[60]`, así que en el teléfono el encabezado del modal quedaba tapado. Pasan a
  `z-[70]`, como `useConfirmacion`, y con `max-h-[90vh] overflow-y-auto` para que rueden por dentro
  en vez de salirse de la pantalla.
- **Servicios plegables** (`/admin/servicios`, que es "Servicios y horario"): el horario de atención
  va debajo de la lista, así que cada servicio nuevo lo empujaba más abajo. Con 9 servicios el
  horario quedaba a 3.876 px; ahora a 1.158 — **2.718 px menos de scroll**.
  - Se pliega **cada servicio**, no la sección entera: plegar el bloque completo obliga a
    desplegarlo para tocar uno solo, y se vuelve al mismo scroll. Plegado, cada uno es una línea
    con nombre, duración y precio, que además deja ver el catálogo de un vistazo.
  - El cuerpo se **desmonta**, no se oculta con `hidden`: ese atributo pone `display:none` pero la
    clase `flex` de Tailwind lo pisa, y la tarjeta seguía ocupando su alto entero. Los campos son
    controlados, así que plegar no pierde lo que se estaba editando.
  - Un servicio nuevo nace abierto (está vacío y hay que llenarlo). Al cargar, guardar o borrar se
    vacía el conjunto de abiertos: las claves se regeneran y quedarían apuntando a nada, con lo que
    el botón diría "Recoger todos" sin haber nada abierto.
  - Arriba, fila de accesos rápidos con ancla a Horario de atención, igual que en Configuración.
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
- Cuenta opcional de cliente (ver y cancelar sus citas desde un enlace al correo). Reservar sin
  cuenta tiene que seguir funcionando igual.
- Página pública o directorio de barberías.

**Descartado:**
- **Modo claro** — 11 nov 2026. A Marcos le gusta el aspecto oscuro actual y no quiere la variante
  clara. Si algún día se retoma: son tokens `cafe-*` en 17 archivos, y hacerlo bien es convertirlos
  en variables que cambien según el tema, no duplicar clases.
- **Cobrar dentro de la app** — 11 nov 2026. Sigue descartado el pago del cliente a la barbería.
  La **suscripción de las barberías a la plataforma** sí queda (migración `009`), pero por ahora
  solo como registro: planes de $15.000–$20.000 al mes, con tres meses de prueba para ver
  rendimiento. Sin pasarela: en esos tres meses no hay nada que cobrar, y el cobro recurrente
  automático exige tarjeta tokenizada —Nequi y PSE son de un solo disparo—, justo lo que menos
  tiene este mercado. Además Wompi sobre $15.000 se lleva ~8,7% por los $700 fijos.
- **Cualquier cosa relacionada con pagos del cliente** — 11 nov 2026. Se construyó el abono para confirmar la
  cita (commit `732923a`) y se revirtió entero (`7b72d86`). El cliente se entiende directo con la
  barbería por WhatsApp y acuerdan ahí el medio de pago. Dato por si vuelve a salir: Wompi cobra
  2,65 % + $700 + IVA por transacción, que sobre un abono de $7.000 es el 15 % — la parte fija es
  la que no cuadra con un ticket de barrio.

## Después del cambio (backlog)

- **Barberos**: cada barbería con sus barberos; cada uno maneja su horario; el cliente elige barbero o
  "cualquiera disponible" según disponibilidad.
- Cuenta opcional de cliente (ver/cancelar sus citas, acceso por enlace al correo) — reservar sin cuenta debe seguir.
- Página pública o directorio de barberías.

### Cerrado el 9 nov 2026 (auditoría previa al cambio)

- ~~El enlace de cancelación se arma con el `Host`~~ → ahora usa `appOrigin()`, igual que los de contraseña.
  Las dos rutas de reserva ya envolvían ese armado en `try/catch`, así que si faltara `APP_URL` la reserva
  sigue guardándose y solo se omite el enlace.
- ~~Cerrar sesiones abiertas al cambiar la contraseña~~ → migración 002 + verificación en `authorizeAdmin`.
- ~~`lib/shared/TenantContext.tsx` huérfano~~ → borrado (cero referencias).
- ~~`/api/email-test`~~ → borrada. Era una ruta de diagnóstico que enviaba correos reales.
- ~~`EMAIL_TO_DEFAULT` en `env.example`~~ → corregido a `marcosbarbershop89@gmail.com` (tenía el correo personal).
- ~~El cron no contaba las citas sin correo del cliente~~ → ahora suman a `skipped`.
