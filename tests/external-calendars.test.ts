import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTERNAL_CALENDAR_PROVIDERS,
  externalCalendarProvider,
  parseExternalCalendarProvider,
} from '../src/calendar/externalCalendars';

test('offers Google and Apple calendar setup choices', () => {
  assert.deepEqual(EXTERNAL_CALENDAR_PROVIDERS.map(({ id }) => id), ['google', 'apple']);
  assert.equal(externalCalendarProvider('google').method, 'OAuth 2.0 · 읽기 전용');
  assert.match(externalCalendarProvider('apple').caution, /기본 암호를 위젯에 입력하면 안 됩니다/);
});

test('accepts only supported stored calendar providers', () => {
  assert.equal(parseExternalCalendarProvider('google'), 'google');
  assert.equal(parseExternalCalendarProvider('apple'), 'apple');
  assert.equal(parseExternalCalendarProvider('outlook'), null);
  assert.equal(parseExternalCalendarProvider(null), null);
});
