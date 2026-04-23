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

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
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
  const slots = getAvailableHoursForDate('2026-03-21', 75);
  assert.ok(!slots.includes('17:00'));
  assert.equal(slots.at(-1), '16:30');
});

runTest('should validate a correct booking payload', () => {
  const result = validateBookingPayload({
    serviceId: 'manicure',
    serviceName: 'Manicure',
    clientName: '  Ana Perez  ',
    clientEmail: 'ANA@example.com',
    clientWhatsApp: '+57 3024075828',
    date: '2026-03-20',
    time: '10:00',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.clientName, 'Ana Perez');
    assert.equal(result.data.clientEmail, 'ana@example.com');
    assert.equal(result.data.clientWhatsApp, '+573024075828');
  }
});

runTest('should reject bookings with mismatched service names', () => {
  const result = validateBookingPayload({
    serviceId: 'manicure',
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
