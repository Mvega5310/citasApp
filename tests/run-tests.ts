import assert from 'node:assert/strict';
import {
  getAvailableHoursForDate,
  getServiceById,
  getServiceDuration,
  getServicePrice,
  services,
} from '../lib/shared/services';
import { validateBookingPayload } from '../lib/server/booking';
import { cleanOptionalText, isValidEmail, isValidPhone, parsePaginationParams } from '../lib/server/api';

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
