import assert from 'node:assert/strict';
import {
  getAvailableHoursForDate,
  getServiceById,
  getServiceDuration,
  getServicePrice,
  resumenSemanal,
  services,
  type WeekSchedule,
} from '../lib/shared/services';
import { validateBookingPayload } from '../lib/server/booking';
import { cleanOptionalText, isValidEmail, isValidPhone, parsePaginationParams } from '../lib/server/api';
import { validarSlug } from '../lib/server/tenantSlug';

let failures = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

runTest('should contain predefined services', () => {
  assert.ok(services.length > 0);
});

runTest('should find service by id', () => {
  const first = services[0];
  const found = getServiceById(first.id);
  assert.equal(found?.name, first.name);
});

runTest('should provide price and duration helpers', () => {
  const first = services[0];
  assert.ok(getServicePrice(first.id) > 0);
  assert.ok(getServiceDuration(first.id) > 0);
});

runTest('should trim late slots when the service no longer fits in the schedule', () => {
  // 2026-03-21 es viernes: horario 09:00–19:00. Con 75 min, el último turno
  // que cabe antes de cerrar es 17:30 (termina 18:45); 18:00 ya no cabe.
  const slots = getAvailableHoursForDate('2026-03-21', 75);
  assert.ok(!slots.includes('18:00'));
  assert.equal(slots.at(-1), '17:30');
});

runTest('should group the weekly schedule into readable rows, not one per day', () => {
  const uniforme: WeekSchedule = {
    0: { start: '09:00', end: '17:00' },
    1: { start: '09:00', end: '19:00' },
    2: { start: '09:00', end: '19:00' },
    3: { start: '09:00', end: '19:00' },
    4: { start: '09:00', end: '19:00' },
    5: { start: '09:00', end: '19:00' },
    6: { start: '09:00', end: '19:00' },
  };
  const filas = resumenSemanal(uniforme);
  assert.deepEqual(filas, [
    { dias: 'Lun – Sáb', texto: '09:00 – 19:00' },
    { dias: 'Dom', texto: '09:00 – 17:00' },
  ]);

  // Un día cerrado en medio de la semana no debe fundirse con sus vecinos
  const conCierre: WeekSchedule = {
    0: { start: '', end: '', closed: true },
    1: { start: '09:00', end: '19:00' },
    2: { start: '09:00', end: '19:00' },
    3: { start: '', end: '', closed: true },
    4: { start: '09:00', end: '19:00' },
    5: { start: '09:00', end: '19:00' },
    6: { start: '09:00', end: '19:00' },
  };
  assert.deepEqual(resumenSemanal(conCierre), [
    { dias: 'Lun – Mar', texto: '09:00 – 19:00' },
    { dias: 'Mié', texto: 'Cerrado' },
    { dias: 'Jue – Sáb', texto: '09:00 – 19:00' },
    { dias: 'Dom', texto: 'Cerrado' },
  ]);

  // Un día sin regla en absoluto (barbería recién creada) cuenta como cerrado
  assert.equal(resumenSemanal({})[0].texto, 'Cerrado');
});

runTest('should validate a correct booking payload', () => {
  const result = validateBookingPayload({
    serviceId: 'corte-cabello',
    serviceName: 'Corte de Cabello',
    clientName: '  Ana Perez  ',
    clientEmail: 'ANA@example.com',
    clientWhatsApp: '+57 3024075828',
    date: '2026-03-20',
    time: '10:00',
    habeasDataAccepted: true,
    notificationsAccepted: true,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.clientName, 'Ana Perez');
    assert.equal(result.data.clientEmail, 'ana@example.com');
    assert.equal(result.data.clientWhatsApp, '+573024075828');
  }
});

runTest('should reject booking without habeas data consent', () => {
  const result = validateBookingPayload({
    serviceId: 'corte-cabello',
    serviceName: 'Corte de Cabello',
    clientName: 'Ana Perez',
    clientEmail: 'ana@example.com',
    clientWhatsApp: '+573024075828',
    date: '2026-03-20',
    time: '10:00',
    habeasDataAccepted: false,
    notificationsAccepted: true,
  });

  assert.equal(result.ok, false);
});

runTest('should reject bookings with mismatched service names', () => {
  const result = validateBookingPayload({
    serviceId: 'corte-cabello',
    serviceName: 'Pedicure',
    clientName: 'Ana Perez',
    clientEmail: 'ana@example.com',
    clientWhatsApp: '+573024075828',
    date: '2026-03-20',
    time: '10:00',
  });

  assert.equal(result.ok, false);
});

runTest('should sanitize and validate common API inputs', () => {
  assert.equal(cleanOptionalText('   '), null);
  assert.equal(isValidEmail('ana@example.com'), true);
  assert.equal(isValidPhone('+573024075828'), true);
  assert.equal(isValidPhone('123'), false);
});

runTest('should validate a tenant slug the same way the resolver and the schema do', () => {
  assert.equal(validarSlug('barberia-del-norte'), null);
  assert.equal(validarSlug('a1'), null);
  // Mayúsculas y espacios no son el formato del subdominio
  assert.ok(validarSlug('Barberia-Norte'));
  assert.ok(validarSlug('-empieza-mal'));
  assert.ok(validarSlug('termina-mal-'));
  // Chocaría con la infraestructura o con una ruta de la plataforma
  assert.ok(validarSlug('admin'));
  assert.ok(validarSlug('registro'), 'su propia página de registro debe quedar reservada');
});

runTest('should clamp pagination params to safe limits', () => {
  const parsed = parsePaginationParams('https://example.com/api/users?limit=999&offset=-5');
  assert.equal(parsed.limit, 100);
  assert.equal(parsed.offset, 0);
});

// ── Pruebas asíncronas ──
async function runAsyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

(async () => {
  // Resend: se reemplaza fetch, no sale ningún correo real
  await runAsyncTest('should derive the subscription state from the dates, never store it', async () => {
    const { estadoDelPlan, DIAS_DE_GRACIA } = await import('../lib/server/suscripcion');
    const hoy = '2026-11-12';
    const plan = (hasta: string | null, precio = 0) => ({ hasta, precio, nota: '' });

    // Sin plazo no vence nunca
    assert.equal(estadoDelPlan(plan(null), hoy).estado, 'cortesia');

    // Sin precio acordado es una prueba; con precio, una suscripción al día
    assert.equal(estadoDelPlan(plan('2027-02-12'), hoy).estado, 'prueba');
    assert.equal(estadoDelPlan(plan('2027-02-12', 15000), hoy).estado, 'al_dia');

    // Avisa antes de que venza
    assert.equal(estadoDelPlan(plan('2026-11-16', 15000), hoy).estado, 'por_vencer');
    assert.equal(estadoDelPlan(plan('2026-11-12', 15000), hoy).estado, 'por_vencer', 'el mismo día aún cuenta');

    // Vencida pero en gracia: nada se corta todavía
    assert.equal(estadoDelPlan(plan('2026-11-11', 15000), hoy).estado, 'gracia');
    assert.equal(estadoDelPlan(plan('2026-11-05', 15000), hoy).estado, 'gracia', `${DIAS_DE_GRACIA} días de margen`);
    assert.equal(estadoDelPlan(plan('2026-11-03', 15000), hoy).estado, 'vencida');

    // Los días restantes son de calendario, no de husos horarios
    assert.equal(estadoDelPlan(plan('2026-11-19'), hoy).diasRestantes, 7);
    assert.equal(estadoDelPlan(plan('2026-11-10'), hoy).diasRestantes, -2);
  });

  await runAsyncTest('should renew by months without the calendar drifting', async () => {
    const { sumarMeses } = await import('../lib/server/suscripcion');

    assert.equal(sumarMeses('2026-11-12', 3), '2027-02-12', 'los tres meses de prueba');
    assert.equal(sumarMeses('2026-11-30', 1), '2026-12-30');
    // Fin de mes: no debe saltar al mes siguiente
    assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
    assert.equal(sumarMeses('2028-01-31', 1), '2028-02-29', 'año bisiesto');
    assert.equal(sumarMeses('2026-10-31', 1), '2026-11-30');
    // Y cruzar el año
    assert.equal(sumarMeses('2026-12-15', 1), '2027-01-15');
  });

  await runAsyncTest('should generate a real PNG for the QR, not SVG text', async () => {
    const { generarQrPng } = await import('../lib/server/qrImage');
    const png = await generarQrPng('https://ejemplo.citas.proyects.store/');
    // Firma PNG: sin esto, el bug de iOS (descargar como texto, no como foto)
    // vuelve a aparecer aunque el Content-Type diga image/png.
    const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.ok(png.subarray(0, 8).equals(FIRMA_PNG), 'debe empezar con la firma PNG');
    assert.ok(png.length > 500, 'un QR real pesa más que un archivo vacío');
  });

  await runAsyncTest('should sanitize a name for a filename and an HTTP header', async () => {
    const { nombreDeArchivo } = await import('../lib/server/qrImage');
    // Nada de acentos, espacios ni mayúsculas sueltas en un nombre de archivo
    assert.equal(nombreDeArchivo('Barbería Norte'), 'barberia-norte');
    assert.equal(nombreDeArchivo('Sálon "Él Corte"'), 'salon-el-corte');
    // Sin nombre, un valor de respaldo: un archivo "qr-.png" se ve roto
    assert.equal(nombreDeArchivo(''), 'barberia');
    assert.equal(nombreDeArchivo('   '), 'barberia');
    // Nada que permita escapar las comillas de Content-Disposition
    assert.ok(!nombreDeArchivo('a"; x=y').includes('"'));
  });

  await runAsyncTest('should only accept a square PNG as the barbería logo', async () => {
    const { revisarLogo } = await import('../lib/server/logoPng');
    const { readFileSync } = await import('node:fs');
    const png = readFileSync('public/icons/logo-192.png');

    const bueno = revisarLogo(png);
    assert.equal(bueno.ok, true);
    if (bueno.ok) assert.deepEqual([bueno.ancho, bueno.alto], [192, 192]);

    // El Content-Type lo escribe quien sube: hay que mirar los bytes.
    const jpegDisfrazado = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(40).fill(0)]);
    assert.equal(revisarLogo(jpegDisfrazado).ok, false, 'un JPEG renombrado no debe pasar');
    assert.equal(revisarLogo(Buffer.from('no soy una imagen')).ok, false);
    assert.equal(revisarLogo(Buffer.alloc(0)).ok, false);

    // 2048×2048 es justo el tamaño del logo original que rompía el generador
    const enorme = Buffer.from(png);
    enorme.writeUInt32BE(2048, 16);
    enorme.writeUInt32BE(2048, 20);
    assert.equal(revisarLogo(enorme).ok, false, 'no debe aceptar 2048 px');

    // Alargado: se pinta en cuadrados de lado fijo, saldría deformado
    const alargado = Buffer.from(png);
    alargado.writeUInt32BE(96, 20);
    assert.equal(revisarLogo(alargado).ok, false, 'no debe aceptar una imagen no cuadrada');

    assert.equal(revisarLogo(Buffer.concat([png, Buffer.alloc(400 * 1024)])).ok, false, 'tope de peso');
  });

  await runAsyncTest('should build the fallback monogram from the barbería name, escaped', async () => {
    const { monogramaSvg } = await import('../lib/server/logoPng');
    // Iniciales de la barbería, no el logo de otra
    assert.ok(monogramaSvg('Barbería Sur').includes('>BS<'));
    assert.ok(monogramaSvg('Norte Premium').includes('>NP<'));
    // Un solo nombre, y el caso sin nombre
    assert.ok(monogramaSvg('Figaro').includes('>F<'));
    assert.ok(monogramaSvg('   ').includes('>BT<'));
    // El nombre lo escribe la barbería y acaba dentro del SVG
    assert.ok(!monogramaSvg('<script>x</script>').includes('<script'));
  });

  await runAsyncTest('should send emails through Resend when RESEND_API_KEY is set', async () => {
    const { sendReminderEmail } = await import('../lib/server/email');
    const calls: { url: string; init: RequestInit }[] = [];
    const realFetch = globalThis.fetch;
    const savedFrom = process.env.EMAIL_FROM;
    process.env.RESEND_API_KEY = 're_prueba';
    process.env.EMAIL_FROM = 'Marcos BarberShop <citas@proyects.store>';
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    }) as typeof fetch;
    try {
      const ok = await sendReminderEmail({ clientName: 'Ana <b>', clientEmail: 'ana@test.co', serviceName: 'Corte', time: '10:00' });
      assert.equal(ok, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://api.resend.com/emails');
      assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer re_prueba');
      const body = JSON.parse(String(calls[0].init.body));
      assert.deepEqual(body.to, ['ana@test.co']);
      assert.equal(body.from, 'Marcos BarberShop <citas@proyects.store>');
      assert.ok(body.html.includes('Ana &lt;b&gt;'), 'el nombre del cliente debe ir escapado');
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.RESEND_API_KEY;
      if (savedFrom) process.env.EMAIL_FROM = savedFrom;
      else delete process.env.EMAIL_FROM;
    }
  });

  await runAsyncTest('should send in the name of the barbería and reply to its own email', async () => {
    const { sendBookingNotification } = await import('../lib/server/email');
    const bodies: Record<string, unknown>[] = [];
    const realFetch = globalThis.fetch;
    const savedFrom = process.env.EMAIL_FROM;
    process.env.RESEND_API_KEY = 're_prueba';
    process.env.EMAIL_FROM = 'BeautyTurno <citas@proyects.store>';
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return new Response('{"id":"x"}', { status: 200 });
    }) as typeof fetch;
    try {
      await sendBookingNotification(
        {
          brand: { name: 'Barbería "Norte" <VIP>', address: '', phone: '', replyTo: 'norte@gmail.com' },
          serviceName: 'Corte',
          clientName: 'Ana',
          clientEmail: 'ana@test.co',
          clientWhatsApp: '+573000000000',
          date: '2026-11-10',
          time: '10:00',
        },
        { admin: 'norte@gmail.com', client: true }
      );
      assert.equal(bodies.length, 2);
      const toClient = bodies.find((b) => (b.to as string[])[0] === 'ana@test.co')!;
      const toShop = bodies.find((b) => (b.to as string[])[0] === 'norte@gmail.com')!;
      // Misma dirección verificada, con el nombre de la barbería (sin comillas ni <> que rompan el encabezado)
      assert.equal(toClient.from, '"Barbería Norte VIP" <citas@proyects.store>');
      assert.equal(toClient.reply_to, 'norte@gmail.com', 'el cliente responde a la barbería');
      assert.equal(toShop.reply_to, 'ana@test.co', 'la barbería responde al cliente');
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.RESEND_API_KEY;
      if (savedFrom) process.env.EMAIL_FROM = savedFrom;
      else delete process.env.EMAIL_FROM;
    }
  });

  await runAsyncTest('should sign and verify a registro token, and reject a tampered one', async () => {
    const { generarTokenRegistro, verificarTokenRegistro } = await import('../lib/server/registroToken');
    const datos = { slug: 'barberia-del-norte', name: 'Barbería del Norte', adminName: 'Ana', adminEmail: 'ana@test.co' };

    const token = await generarTokenRegistro(datos);
    const verificado = await verificarTokenRegistro(token);
    assert.deepEqual(verificado, datos);

    // Un token cualquiera (o uno de otro propósito) no debe aceptarse
    assert.equal(await verificarTokenRegistro('no-soy-un-token'), null);
    assert.equal(await verificarTokenRegistro(`${token}x`), null, 'un token alterado no debe verificar');
  });

  await runAsyncTest('should report a failed send when Resend rejects the email', async () => {
    const { sendReminderEmail } = await import('../lib/server/email');
    const realFetch = globalThis.fetch;
    process.env.RESEND_API_KEY = 're_prueba';
    globalThis.fetch = (async () => new Response('dominio no verificado', { status: 403 })) as typeof fetch;
    try {
      const ok = await sendReminderEmail({ clientName: 'Ana', clientEmail: 'ana@test.co', serviceName: 'Corte', time: '10:00' });
      assert.equal(ok, false);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.RESEND_API_KEY;
    }
  });

  if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll tests passed.');
})();
