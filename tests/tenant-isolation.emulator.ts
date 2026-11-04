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

  console.log(fails === 0 ? '\nTODAS LAS PRUEBAS PASARON' : `\n${fails} PRUEBA(S) FALLARON`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
