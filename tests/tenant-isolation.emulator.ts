/**
 * Prueba de aislamiento multi-tenant: la misma batería sobre ambas bases.
 * Nunca toca datos reales.
 *
 * Firestore (emulador local):
 *   1. npm run emulators        (en otra terminal)
 *   2. npm run test:tenants
 *
 * Postgres (base de pruebas "citas_test" en Railway):
 *   1. npm run db:migrate:test  (crea/actualiza la base de pruebas)
 *   2. npm run test:tenants -- --postgres
 */
import { loadEnvConfig } from '@next/env';
import { firestoreFixtures, postgresFixtures } from './fixtures';

const BACKEND = process.argv.includes('--postgres') ? 'postgres' : 'firestore';
loadEnvConfig(process.cwd());

// Firebase Auth sigue en uso hasta el paso 3: siempre apunta al emulador, nunca al real
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.ADMIN_SECRET = 'clave-de-prueba-solo-emulador';
process.env.NEXT_PUBLIC_DEFAULT_TENANT = 'demo';
process.env.DATA_BACKEND = BACKEND;
if (BACKEND === 'postgres') {
  // Siempre la base de pruebas, nunca la de la app
  const base = new URL(process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL || '');
  base.pathname = '/citas_test';
  process.env.DATABASE_URL = base.toString();
} else {
  delete process.env.DATABASE_URL;
}
delete process.env.RAILWAY_DATABASE_URL;
// Sin SMTP: ningún correo sale de la prueba
delete process.env.EMAIL_SERVER_HOST;
process.env.EMAIL_TO_DEFAULT = 'duenio@marcos.test';

const ROOT = process.cwd().replace(/\\/g, '/');

async function main() {
  const { pathToFileURL } = await import('node:url');
  const imp = (rel: string) => import(pathToFileURL(`${ROOT}/${rel}`).href);
  const { signSession } = await imp('lib/server/session.ts');
  const { NextRequest } = await imp('node_modules/next/server.js');
  const appts = await imp('app/api/admin/appointments/route.ts');
  const apptId = await imp('app/api/admin/appointments/[id]/route.ts');
  const users = await imp('app/api/admin/users/route.ts');
  const userId = await imp('app/api/admin/users/[uid]/route.ts');
  const blocked = await imp('app/api/admin/blocked-slots/route.ts');
  const me = await imp('app/api/admin/me/route.ts');
  const seed = await imp('app/api/admin/seed/route.ts');
  const settings = await imp('app/api/admin/settings/route.ts');
  const catalogRoute = await imp('app/api/catalog/route.ts');
  const bookings = await imp('app/api/bookings/route.ts');
  const adminCatalog = await imp('app/api/admin/catalog/route.ts');
  const settingsLib = await imp('lib/server/settings.ts');
  const reminders = await imp('lib/server/reminders.ts');
  const contact = await imp('app/api/contact/route.ts');
  const login = await imp('app/api/admin/login/route.ts');
  const forgot = await imp('app/api/admin/password/forgot/route.ts');
  const reset = await imp('app/api/admin/password/reset/route.ts');

  const fx = BACKEND === 'postgres' ? await postgresFixtures(ROOT) : await firestoreFixtures(ROOT);
  console.log(`Base: ${BACKEND}${BACKEND === 'postgres' ? ' (citas_test)' : ' (emulador)'}\n`);
  // Empezar siempre desde cero
  await fx.reset();
  // Datos de prueba
  const closedDay = { open: '00:00', close: '00:00', closed: true };
  await fx.tenant('norte', {
    name: 'Barbería Norte', active: true,
    services: [
      { id: 'fade', name: 'Fade', description: '', duration: 40, price: 20000, icon: '' },
      { id: 'oculto', name: 'Oculto', description: '', duration: 30, price: 1, icon: '', active: false },
      { id: 'roto', name: '', duration: 'x', price: 1 },
    ],
    workingHours: { domingo: closedDay, lunes: { open: '10:00', close: '18:00', closed: false }, martes: closedDay,
      miercoles: closedDay, jueves: closedDay, viernes: closedDay, sabado: closedDay },
  });
  await fx.tenant('nuevo', { name: 'Barbería Nueva', active: true });
  await fx.withoutProfile('demo'); // demo sin ficha, como en producción
  await fx.tenant('sur', { name: 'Barbería Sur', active: false });
  const appt = { clientName: 'X', status: 'pending', createdAt: new Date().toISOString() };
  await fx.appointment('demo', 'd1', appt);
  await fx.appointment('norte', 'n1', appt);
  await fx.legacySettings({ salonName: 'Nombre Legacy', phone: '111' }); // configuración global anterior
  await fx.admin('a-demo', { name: 'Admin Demo', role: 'admin' }); // sin barbería = demo
  await fx.admin('v-demo', { name: 'Viewer Demo', role: 'viewer' });
  await fx.admin('a-norte', { name: 'Admin Norte', role: 'admin', tenantSlug: 'norte' });

  const legacyDemo = await signSession({ uid: 'a-demo', email: 'a@demo', name: 'Admin Demo', role: 'admin' });
  const viewerDemo = await signSession({ uid: 'v-demo', email: 'v@demo', name: 'Viewer', role: 'viewer', tenantSlug: 'demo' });
  const norte = await signSession({ uid: 'a-norte', email: 'a@norte', name: 'Admin Norte', role: 'admin', tenantSlug: 'norte', createdAt: new Date() });

  const req = (method: string, path: string, tenant: string, token?: string, body?: unknown) =>
    new NextRequest(`http://localhost${path}`, {
      method,
      headers: {
        'x-tenant-slug': tenant, // lo que pondría el middleware
        'content-type': 'application/json',
        ...(token ? { cookie: `admin_session=${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let fails = 0;
  const check = async (name: string, resP: Promise<Response>, status: number, extra?: (j: any) => boolean) => {
    const res = await resP;
    const json = await res.json().catch(() => null);
    const ok = res.status === status && (!extra || extra(json));
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${res.status}${ok ? '' : ' ' + JSON.stringify(json)}`);
  };
  const ids = (j: any) => (j?.rows ?? []).map((r: any) => r.id).sort().join(',');
  const uids = (j: any) => (j ?? []).map((u: any) => u.uid).sort().join(',');

  await check('Admin demo (sesión antigua sin barbería) lista citas de demo', appts.GET(req('GET', '/api/admin/appointments', 'demo', legacyDemo)), 200, (j) => ids(j) === 'd1');
  await check('Admin norte NO puede listar citas de demo', appts.GET(req('GET', '/api/admin/appointments', 'demo', norte)), 403);
  await check('Admin norte lista solo citas de norte', appts.GET(req('GET', '/api/admin/appointments', 'norte', norte)), 200, (j) => ids(j) === 'n1');
  await check('Admin norte NO puede cambiar cita de demo usando su ID', apptId.PATCH(req('PATCH', '/x', 'norte', norte, { status: 'cancelled' }), { params: { id: 'd1' } }), 404);
  await check('Admin norte NO puede borrar cita de demo usando su ID', apptId.DELETE(req('DELETE', '/x', 'norte', norte), { params: { id: 'd1' } }), 404);
  const d1 = await fx.readAppointment('demo', 'd1');
  console.log(`${d1?.status === 'pending' ? 'PASS' : 'FAIL'}  La cita d1 de demo sigue intacta`);
  if (d1?.status !== 'pending') fails++;
  await check('Admin demo SÍ cambia el estado de su cita', apptId.PATCH(req('PATCH', '/x', 'demo', legacyDemo, { status: 'confirmed' }), { params: { id: 'd1' } }), 200);
  await check('Equipo de demo: solo admins de demo', users.GET(req('GET', '/api/admin/users', 'demo', legacyDemo)), 200, (j) => uids(j) === 'a-demo,v-demo');
  await check('Equipo de norte: solo admins de norte', users.GET(req('GET', '/api/admin/users', 'norte', norte)), 200, (j) => uids(j) === 'a-norte');
  await check('Admin norte NO puede eliminar a un admin de demo', userId.DELETE(req('DELETE', '/x', 'norte', norte), { params: { uid: 'a-demo' } }), 404);
  await check('Admin norte NO puede editar a un admin de demo', userId.PATCH(req('PATCH', '/x', 'norte', norte, { role: 'viewer' }), { params: { uid: 'a-demo' } }), 404);
  const aDemo = await fx.readAdmin('a-demo');
  console.log(`${aDemo?.role === 'admin' ? 'PASS' : 'FAIL'}  El admin a-demo sigue intacto`);
  if (aDemo?.role !== 'admin') fails++;
  await check('Viewer no gestiona Equipo (se mantiene la regla de rol)', users.GET(req('GET', '/api/admin/users', 'demo', viewerDemo)), 403);
  await check('Admin norte NO bloquea horarios de demo', blocked.POST(req('POST', '/x', 'demo', norte, { date: '2026-12-01', slots: ['10:00'], action: 'block' })), 403);
  await check('Barbería suspendida (sur) rechaza todo', appts.GET(req('GET', '/api/admin/appointments', 'sur', norte)), 403);
  await check('Barbería inexistente → 404', appts.GET(req('GET', '/api/admin/appointments', 'fantasma', norte)), 404);
  await check('Sin sesión → 401', appts.GET(req('GET', '/api/admin/appointments', 'demo')), 401);
  await check('Perfil (me) de demo con sesión antigua', me.GET(req('GET', '/api/admin/me', 'demo', legacyDemo)), 200, (j) => j?.uid === 'a-demo');
  await check('Perfil (me) de demo con sesión de norte → 403', me.GET(req('GET', '/api/admin/me', 'demo', norte)), 403);
  await check('Seed en norte (ya tiene admin) → 409', seed.POST(req('POST', '/x', 'norte', undefined, { setupKey: process.env.ADMIN_SECRET, email: 'n@x.co', password: 'secreto123', name: 'N' })), 409);

  // ── Configuración por barbería ──
  await check('Config demo sin doc propio lee el documento global anterior', settings.GET(req('GET', '/x', 'demo', legacyDemo)), 200, (j) => j?.salonName === 'Nombre Legacy');
  await check('Config norte usa los datos de su ficha, no los de demo', settings.GET(req('GET', '/x', 'norte', norte)), 200, (j) => j?.salonName === 'Barbería Norte');
  await check('Admin demo guarda su teléfono', settings.PATCH(req('PATCH', '/x', 'demo', legacyDemo, { phone: '222' })), 200);
  const demoCfg = await fx.readSettings('demo');
  const legacyCfg = await fx.readLegacySettings();
  const migrated = demoCfg?.salonName === 'Nombre Legacy' && demoCfg?.phone === '222' && legacyCfg?.phone === '111';
  console.log(`${migrated ? 'PASS' : 'FAIL'}  Al guardar, demo conserva los datos anteriores y el doc global no se toca`);
  if (!migrated) fails++;
  await check('Admin norte cambia su nombre', settings.PATCH(req('PATCH', '/x', 'norte', norte, { salonName: 'Norte Premium' })), 200);
  await check('El cambio de norte no afecta a demo', settings.GET(req('GET', '/x', 'demo', legacyDemo)), 200, (j) => j?.salonName === 'Nombre Legacy' && j?.phone === '222');
  await check('Admin norte NO edita la config de demo', settings.PATCH(req('PATCH', '/x', 'demo', norte, { salonName: 'Hackeado' })), 403);
  await check('Tipo inválido → 400', settings.PATCH(req('PATCH', '/x', 'demo', legacyDemo, { notifyClient: 'si' })), 400);
  await check('Campo desconocido se ignora (no se guarda)', settings.PATCH(req('PATCH', '/x', 'demo', legacyDemo, { role: 'superadmin' })), 200, (j) => !('role' in (j?.settings ?? {})));

  // ── Catálogo (servicios + horario) por barbería ──
  const svcIds = (j: any) => (j?.services ?? []).map((x: any) => x.id).join(',');
  await check('Catálogo demo (sin ficha) = catálogo original', catalogRoute.GET(req('GET', '/api/catalog', 'demo')), 200, (j) => svcIds(j) === 'corte-cabello,corte-barba,cejas,solo-barba');
  await check('Catálogo norte = sus servicios (ignora desactivados y mal formados)', catalogRoute.GET(req('GET', '/api/catalog', 'norte')), 200, (j) => svcIds(j) === 'fade' && j.schedule['1'].start === '10:00' && j.schedule['2'].closed === true);
  await check('Barbería nueva sin configurar: sin servicios y cerrada', catalogRoute.GET(req('GET', '/api/catalog', 'nuevo')), 200, (j) => svcIds(j) === '' && Object.values(j.schedule).every((d: any) => d.closed));
  await check('Catálogo de barbería suspendida → 403', catalogRoute.GET(req('GET', '/api/catalog', 'sur')), 403);
  const booking = (serviceId: string, serviceName: string, date: string, time: string) => ({
    serviceId, serviceName, clientName: 'Ana', clientEmail: 'ana@test.co', clientWhatsApp: '3001234567', date, time, habeasDataAccepted: true,
  });
  await check('Norte rechaza un servicio de demo', bookings.POST(req('POST', '/api/bookings', 'norte', undefined, booking('corte-cabello', 'Corte de Cabello', '2027-03-01', '10:00'))), 400, (j) => /no existe/.test(j?.error));
  await check('Norte rechaza su servicio en un día cerrado (martes)', bookings.POST(req('POST', '/api/bookings', 'norte', undefined, booking('fade', 'Fade', '2027-03-02', '10:00'))), 400, (j) => /fuera del horario/.test(j?.error));
  await check('Norte rechaza hora antes de abrir (09:00)', bookings.POST(req('POST', '/api/bookings', 'norte', undefined, booking('fade', 'Fade', '2027-03-01', '09:00'))), 400, (j) => /fuera del horario/.test(j?.error));
  await check('Demo rechaza un servicio de norte', bookings.POST(req('POST', '/api/bookings', 'demo', undefined, booking('fade', 'Fade', '2027-03-01', '10:00'))), 400, (j) => /no existe/.test(j?.error));

  // ── Editor de catálogo (admin) ──
  await check('Editor demo muestra también los servicios inactivos', adminCatalog.GET(req('GET', '/x', 'demo', legacyDemo)), 200, (j) => j?.services?.length === 7 && j.services.filter((x: any) => !x.active).length === 3 && j.workingHours?.lunes?.open === '09:00');
  const hoursAll = (open: string, close: string) => Object.fromEntries(['domingo','lunes','martes','miercoles','jueves','viernes','sabado'].map((k) => [k, { open, close, closed: k === 'domingo' }]));
  const norteCatalog = { services: [{ id: 'fade', name: 'Fade Premium', description: 'Degradado', duration: 45, price: 25000, active: true }], workingHours: hoursAll('08:00', '17:00') };
  await check('Viewer no puede guardar el catálogo', adminCatalog.PUT(req('PUT', '/x', 'demo', viewerDemo, norteCatalog)), 403);
  await check('Admin norte no puede guardar el catálogo de demo', adminCatalog.PUT(req('PUT', '/x', 'demo', norte, norteCatalog)), 403);
  await check('Duración inválida → 400', adminCatalog.PUT(req('PUT', '/x', 'norte', norte, { ...norteCatalog, services: [{ ...norteCatalog.services[0], duration: 7 }] })), 400, (j) => /duración/.test(j?.error));
  await check('Cierre antes de apertura → 400', adminCatalog.PUT(req('PUT', '/x', 'norte', norte, { ...norteCatalog, workingHours: hoursAll('17:00', '08:00') })), 400, (j) => /cierre/.test(j?.error));
  await check('Ids repetidos → 400', adminCatalog.PUT(req('PUT', '/x', 'norte', norte, { ...norteCatalog, services: [norteCatalog.services[0], norteCatalog.services[0]] })), 400, (j) => /repetido/.test(j?.error));
  await check('Admin norte guarda su catálogo', adminCatalog.PUT(req('PUT', '/x', 'norte', norte, norteCatalog)), 200);
  await check('El catálogo público de norte refleja el cambio al instante', catalogRoute.GET(req('GET', '/api/catalog', 'norte')), 200, (j) => j?.services?.[0]?.name === 'Fade Premium' && j.schedule['1'].start === '08:00' && j.schedule['0'].closed === true);
  await check('El catálogo de demo no cambió', catalogRoute.GET(req('GET', '/api/catalog', 'demo')), 200, (j) => svcIds(j) === 'corte-cabello,corte-barba,cejas,solo-barba');
  const demoCatalog = { services: [{ id: 'corte-cabello', name: 'Corte de Cabello', description: '', duration: 30, price: 14000, active: true }], workingHours: hoursAll('09:00', '19:00') };
  await check('Admin demo guarda su catálogo (crea su ficha)', adminCatalog.PUT(req('PUT', '/x', 'demo', legacyDemo, demoCatalog)), 200);
  await check('Demo con ficha sigue funcionando y usa su nuevo precio', catalogRoute.GET(req('GET', '/api/catalog', 'demo')), 200, (j) => svcIds(j) === 'corte-cabello' && j.services[0].price === 14000);
  await check('La config de demo conserva su nombre tras crear la ficha', settings.GET(req('GET', '/x', 'demo', legacyDemo)), 200, (j) => j?.salonName === 'Nombre Legacy');

  // ── Destinatarios de correos por barbería ──
  const eq = async (name: string, actual: unknown, expected: unknown) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  → ${JSON.stringify(actual)} (esperado ${JSON.stringify(expected)})`}`);
  };
  await check('Norte configura su correo y desactiva avisos al cliente', settings.PATCH(req('PATCH', '/x', 'norte', norte, { contactEmail: 'norte@barberia.test', notifyClient: false })), 200);
  const T = (slug: string) => settingsLib.tenantFromSlug(slug);
  await eq('Demo: avisos al dueño (EMAIL_TO_DEFAULT) y al cliente', await settingsLib.recipientsFor(await T('demo')), { admin: 'duenio@marcos.test', client: true });
  await eq('Norte: avisos a SU correo, sin copia al cliente', await settingsLib.recipientsFor(await T('norte')), { admin: 'norte@barberia.test', client: false });
  await eq('Barbería sin correo: nadie recibe sus avisos (nunca el dueño de demo)', await settingsLib.recipientsFor(await T('nuevo')), { admin: null, client: true });
  await eq('Contacto de norte va a norte', await settingsLib.businessEmailFor(await T('norte')), 'norte@barberia.test');
  await eq('Contacto de una barbería sin correo no va a nadie', await settingsLib.businessEmailFor(await T('nuevo')), null);

  // ── Recordatorios: todas las barberías, ventana de 10 min ──
  const day = '2027-03-01';
  const nowMs = Date.UTC(2027, 2, 1, 15, 0); // 10:00 en Colombia
  const appt2 = (time: string, status = 'pending', extra = {}) => ({ clientName: 'C', clientEmail: 'c@test.co', serviceName: 'S', date: day, time, status, ...extra });
  await fx.appointment('demo', 'r1', appt2('10:00'));
  await fx.appointment('', 'r2', appt2('10:10', 'confirmed')); // colección antigua
  await fx.appointment('norte', 'r3', appt2('10:05'));
  await fx.appointment('norte', 'r4', appt2('10:30'));
  await fx.appointment('norte', 'r5', appt2('10:00', 'cancelled'));
  // 10:05 (no 10:00): dos citas activas en el mismo horario son imposibles en Postgres
  await fx.appointment('demo', 'r6', appt2('10:05', 'pending', { reminderSent: true }));
  const hits = await reminders.findUpcomingAppointments({ date: day, time: '10:00' }, { date: day, time: '10:10' });
  await eq('Recordatorio encuentra citas de todas las barberías dentro de la ventana',
    hits.map((h: any) => `${h.tenantSlug}/${h.id}`).sort(), ['demo/r1', 'demo/r2', 'norte/r3']);
  const run = await reminders.runReminders(nowMs);
  await eq('Norte (sin aviso al cliente) se omite; sin SMTP no se marca nada', { sent: run.sent, skipped: run.skipped }, { sent: 0, skipped: 1 });
  const r1 = await fx.readAppointment('demo', 'r1');
  await eq('Una cita no queda marcada si el correo no salió', r1?.reminderSent ?? false, false);

  // ── Reserva simultánea del mismo horario (solo Postgres lo garantiza) ──
  if (BACKEND === 'postgres') {
    const sameSlot = () => bookings.POST(req('POST', '/api/bookings', 'norte', undefined, {
      ...booking('fade', 'Fade Premium', '2027-03-01', '11:00'), clientEmail: `c${Math.random()}@test.co`,
    }));
    const results = await Promise.all([sameSlot(), sameSlot(), sameSlot()]);
    await eq('Tres clientes reservan el mismo horario a la vez: entra uno, los demás reciben 409',
      results.map((r: Response) => r.status).sort(), [201, 409, 409]);
  }

  // ── Marca de cada barbería en los correos + escape de HTML ──
  await eq('Marca de demo: su nombre, y dirección real en vez de la de ejemplo',
    (await settingsLib.emailContextFor(await T('demo'))).brand, { name: 'Nombre Legacy', address: 'Bella vista, Colombia', phone: '222' });
  await eq('Marca de norte: solo sus propios datos', (await settingsLib.emailContextFor(await T('norte'))).brand, { name: 'Norte Premium', address: '', phone: '' });

  // Transporte de correo falso: captura los mensajes, no envía nada
  const { createRequire } = await import('node:module');
  const nodemailer = createRequire(`${ROOT}/package.json`)('nodemailer');
  const outbox: any[] = [];
  nodemailer.createTransport = () => ({ sendMail: async (m: any) => { outbox.push(m); return {}; } });
  process.env.EMAIL_SERVER_HOST = 'smtp.fake'; process.env.EMAIL_SERVER_USER = 'u'; process.env.EMAIL_SERVER_PASSWORD = 'p';

  await check('Contacto en norte con HTML en el mensaje', contact.POST(req('POST', '/api/contact', 'norte', undefined, {
    name: '<b>Ana</b>', email: 'ana@test.co', subject: 'otro', message: 'Hola <a href="http://malo.test">clic aquí</a> gracias',
  })), 201, (j) => j?.sent === true);
  const contactMail = outbox.find((m) => m.to === 'norte@barberia.test');
  await eq('El mensaje de contacto llega a norte', !!contactMail, true);
  await eq('El HTML del cliente llega escapado (sin enlaces inyectados)',
    { escaped: contactMail?.html.includes('&lt;a href=&quot;http://malo.test&quot;&gt;'), raw: contactMail?.html.includes('<a href="http://malo.test"') }, { escaped: true, raw: false });
  await eq('El correo de norte lleva su marca y no la de demo',
    { norte: contactMail?.html.includes('Norte Premium'), marcos: contactMail?.html.includes('Marcos BarberShop') || contactMail?.html.includes('Nombre Legacy') }, { norte: true, marcos: false });

  outbox.length = 0;
  const run2 = await reminders.runReminders(nowMs);
  await eq('Recordatorios con SMTP: salen los de demo, norte se omite', { sent: run2.sent, skipped: run2.skipped }, { sent: 2, skipped: 1 });
  const reminderHtml = outbox.map((m) => m.html).join('');
  await eq('El recordatorio de demo lleva su marca y la dirección real (no "Calle 123")',
    { name: reminderHtml.includes('Nombre Legacy'), addr: reminderHtml.includes('Bella vista, Colombia'), fake: reminderHtml.includes('Calle 123') }, { name: true, addr: true, fake: false });
  const r1after = await fx.readAppointment('demo', 'r1');
  await eq('La cita queda marcada tras enviar el recordatorio', r1after?.reminderSent, true);
  const run3 = await reminders.runReminders(nowMs);
  await eq('Una segunda pasada no repite recordatorios', run3.sent, 0);

  // ── Inicio de sesión propio (solo con Postgres) ──
  if (BACKEND === 'postgres') {
    const { query: sql } = await imp('lib/server/pg.ts');
    const tokenFrom = (html: string) => /token=([A-Za-z0-9_-]{20,})/.exec(html ?? '')?.[1] ?? '';
    const loginAs = (tenant: string, email: string, password: string) =>
      login.POST(req('POST', '/api/admin/login', tenant, undefined, { email, password }));
    const setPassword = (tenant: string, token: string, password: string) =>
      reset.POST(req('POST', '/api/admin/password/reset', tenant, undefined, { token, password }));

    outbox.length = 0;
    await check('Admin norte invita a un barbero', users.POST(req('POST', '/api/admin/users', 'norte', norte, {
      email: 'Nuevo@Norte.test', name: 'Nuevo Barbero', role: 'viewer',
    })), 200, (j) => j?.emailSent === true);
    const invite = outbox.find((m) => String(m.to).toLowerCase() === 'nuevo@norte.test');
    const inviteToken = tokenFrom(invite?.html);
    await eq('La invitación trae un enlace para crear la contraseña', inviteToken.length > 20, true);
    await check('Sin contraseña creada todavía no puede entrar', loginAs('norte', 'nuevo@norte.test', 'Clave2027segura'), 401);
    await check('Contraseña débil se rechaza', setPassword('norte', inviteToken, 'abc'), 400);
    await check('Crea su contraseña con el enlace', setPassword('norte', inviteToken, 'Clave2027segura'), 200);
    await check('El mismo enlace no sirve dos veces', setPassword('norte', inviteToken, 'OtraClave2027'), 400);
    await check('Contraseña incorrecta → 401', loginAs('norte', 'nuevo@norte.test', 'NoEsLaClave1'), 401);
    const ok = await loginAs('norte', 'NUEVO@norte.test', 'Clave2027segura');
    await eq('Contraseña correcta → entra (correo sin importar mayúsculas)', ok.status, 200);
    await eq('Al entrar recibe la cookie de sesión', /admin_session=/.test(ok.headers.get('set-cookie') ?? ''), true);
    await check('Con las mismas credenciales no entra a otra barbería', loginAs('demo', 'nuevo@norte.test', 'Clave2027segura'), 401);

    outbox.length = 0;
    await check('"Olvidé mi contraseña" con correo desconocido: misma respuesta', forgot.POST(req('POST', '/x', 'norte', undefined, { email: 'nadie@norte.test' })), 200);
    await eq('…y no se envía ningún correo', outbox.length, 0);
    await check('"Olvidé mi contraseña" con correo válido', forgot.POST(req('POST', '/x', 'norte', undefined, { email: 'nuevo@norte.test' })), 200);
    const resetMail = outbox.find((m) => m.to === 'nuevo@norte.test');
    const resetToken = tokenFrom(resetMail?.html);
    await eq('Llega el enlace de restablecimiento (1 hora)', { token: resetToken.length > 20, expira: /1 hora/.test(resetMail?.html ?? '') }, { token: true, expira: true });
    await sql(`UPDATE password_tokens SET expires_at = now() - interval '1 minute' WHERE used_at IS NULL`);
    await check('Un enlace vencido no sirve', setPassword('norte', resetToken, 'NuevaClave2027'), 400);

    for (let i = 0; i < 5; i++) await loginAs('norte', 'atacante@norte.test', `intento${i}x`);
    await check('Tras 5 intentos fallidos el correo queda bloqueado (429)', loginAs('norte', 'atacante@norte.test', 'otro1234x'), 429);

    const nuevo = (await users.GET(req('GET', '/api/admin/users', 'norte', norte)).then((r: Response) => r.json()))
      .find((u: any) => u.email === 'nuevo@norte.test');
    await check('Admin norte elimina al barbero', userId.DELETE(req('DELETE', '/x', 'norte', norte), { params: { uid: nuevo?.uid } }), 200);
    await check('Una cuenta eliminada ya no entra', loginAs('norte', 'nuevo@norte.test', 'Clave2027segura'), 401);

    const seedBody = { setupKey: process.env.ADMIN_SECRET, email: 'duena@nueva.test', name: 'Dueña Nueva' };
    await check('Primer admin con contraseña débil → 400', seed.POST(req('POST', '/x', 'nuevo', undefined, { ...seedBody, password: 'corta' })), 400);
    await check('Primer admin de la barbería "nuevo"', seed.POST(req('POST', '/x', 'nuevo', undefined, { ...seedBody, password: 'PrimeraClave2027' })), 200);
    await check('El primer admin entra a su barbería', loginAs('nuevo', 'duena@nueva.test', 'PrimeraClave2027'), 200);
    const stored = (await sql(`SELECT password_hash FROM admins WHERE email = 'duena@nueva.test'`)).rows[0]?.password_hash ?? '';
    await eq('La contraseña se guarda cifrada (nunca en texto)', stored.startsWith('scrypt$') && !stored.includes('PrimeraClave2027'), true);
  }

  await fx.close();
  console.log(fails === 0 ? '\nTODAS LAS PRUEBAS PASARON' : `\n${fails} PRUEBA(S) FALLARON`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
