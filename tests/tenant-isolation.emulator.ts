/**
 * Prueba de aislamiento multi-tenant (admin).
 * Corre SIEMPRE contra el emulador local de Firestore, nunca contra Firebase real.
 *
 * Uso:
 *   1. npm run emulators        (en otra terminal)
 *   2. npm run test:tenants
 */
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.ADMIN_SECRET = 'clave-de-prueba-solo-emulador';
process.env.NEXT_PUBLIC_DEFAULT_TENANT = 'demo';
delete process.env.DATABASE_URL;
// Sin SMTP: ningún correo sale de la prueba
delete process.env.EMAIL_SERVER_HOST;
process.env.EMAIL_TO_DEFAULT = 'duenio@marcos.test';

const ROOT = process.cwd().replace(/\\/g, '/');

async function main() {
  const { pathToFileURL } = await import('node:url');
  const imp = (rel: string) => import(pathToFileURL(`${ROOT}/${rel}`).href);
  const { adminDb } = await imp('lib/server/firebaseAdmin.ts');
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

  const db = adminDb();
  // Datos de prueba
  const closedDay = { open: '00:00', close: '00:00', closed: true };
  await db.collection('tenants').doc('norte').set({
    name: 'Barbería Norte', active: true,
    services: [
      { id: 'fade', name: 'Fade', description: '', duration: 40, price: 20000, icon: '' },
      { id: 'oculto', name: 'Oculto', description: '', duration: 30, price: 1, icon: '', active: false },
      { id: 'roto', name: '', duration: 'x', price: 1 },
    ],
    workingHours: { domingo: closedDay, lunes: { open: '10:00', close: '18:00', closed: false }, martes: closedDay,
      miercoles: closedDay, jueves: closedDay, viernes: closedDay, sabado: closedDay },
  });
  await db.collection('tenants').doc('nuevo').set({ name: 'Barbería Nueva', active: true });
  await db.collection('tenants').doc('demo').delete(); // demo sin ficha, como en producción
  await db.collection('tenants').doc('sur').set({ name: 'Barbería Sur', active: false });
  const appt = { clientName: 'X', status: 'pending', createdAt: new Date().toISOString() };
  await db.collection('tenants').doc('demo').collection('appointments').doc('d1').set(appt);
  await db.collection('tenants').doc('norte').collection('appointments').doc('n1').set(appt);
  await db.collection('settings').doc('salon').set({ salonName: 'Nombre Legacy', phone: '111' }); // documento global anterior
  await db.collection('tenants').doc('demo').collection('settings').doc('salon').delete();
  await db.collection('tenants').doc('norte').collection('settings').doc('salon').delete();
  await db.collection('admins').doc('a-demo').set({ name: 'Admin Demo', role: 'admin', createdAt: new Date() }); // sin barbería = demo
  await db.collection('admins').doc('v-demo').set({ name: 'Viewer Demo', role: 'viewer', createdAt: new Date() });
  await db.collection('admins').doc('a-norte').set({ name: 'Admin Norte', role: 'admin', tenantSlug: 'norte', createdAt: new Date() });

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
  const d1 = await db.collection('tenants').doc('demo').collection('appointments').doc('d1').get();
  console.log(`${d1.exists && d1.data()?.status === 'pending' ? 'PASS' : 'FAIL'}  La cita d1 de demo sigue intacta`);
  if (!(d1.exists && d1.data()?.status === 'pending')) fails++;
  await check('Admin demo SÍ cambia el estado de su cita', apptId.PATCH(req('PATCH', '/x', 'demo', legacyDemo, { status: 'confirmed' }), { params: { id: 'd1' } }), 200);
  await check('Equipo de demo: solo admins de demo', users.GET(req('GET', '/api/admin/users', 'demo', legacyDemo)), 200, (j) => uids(j) === 'a-demo,v-demo');
  await check('Equipo de norte: solo admins de norte', users.GET(req('GET', '/api/admin/users', 'norte', norte)), 200, (j) => uids(j) === 'a-norte');
  await check('Admin norte NO puede eliminar a un admin de demo', userId.DELETE(req('DELETE', '/x', 'norte', norte), { params: { uid: 'a-demo' } }), 404);
  await check('Admin norte NO puede editar a un admin de demo', userId.PATCH(req('PATCH', '/x', 'norte', norte, { role: 'viewer' }), { params: { uid: 'a-demo' } }), 404);
  const aDemo = await db.collection('admins').doc('a-demo').get();
  console.log(`${aDemo.exists && aDemo.data()?.role === 'admin' ? 'PASS' : 'FAIL'}  El admin a-demo sigue intacto`);
  if (!(aDemo.exists && aDemo.data()?.role === 'admin')) fails++;
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
  const demoCfg = (await db.collection('tenants').doc('demo').collection('settings').doc('salon').get()).data();
  const legacyCfg = (await db.collection('settings').doc('salon').get()).data();
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
  await db.collection('tenants').doc('demo').collection('appointments').doc('r1').set(appt2('10:00'));
  await db.collection('appointments').doc('r2').set(appt2('10:10', 'confirmed')); // colección antigua
  await db.collection('tenants').doc('norte').collection('appointments').doc('r3').set(appt2('10:05'));
  await db.collection('tenants').doc('norte').collection('appointments').doc('r4').set(appt2('10:30'));
  await db.collection('tenants').doc('norte').collection('appointments').doc('r5').set(appt2('10:00', 'cancelled'));
  await db.collection('tenants').doc('demo').collection('appointments').doc('r6').set(appt2('10:00', 'pending', { reminderSent: true }));
  const hits = await reminders.findUpcomingAppointments({ date: day, time: '10:00' }, { date: day, time: '10:10' });
  await eq('Recordatorio encuentra citas de todas las barberías dentro de la ventana',
    hits.map((h: any) => `${h.tenantSlug}/${h.id}`).sort(), ['demo/r1', 'demo/r2', 'norte/r3']);
  const run = await reminders.runReminders(nowMs);
  await eq('Norte (sin aviso al cliente) se omite; sin SMTP no se marca nada', { sent: run.sent, skipped: run.skipped }, { sent: 0, skipped: 1 });
  const r1 = (await db.collection('tenants').doc('demo').collection('appointments').doc('r1').get()).data();
  await eq('Una cita no queda marcada si el correo no salió', r1?.reminderSent ?? false, false);

  console.log(fails === 0 ? '\nTODAS LAS PRUEBAS PASARON' : `\n${fails} PRUEBA(S) FALLARON`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
