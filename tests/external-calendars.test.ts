import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTERNAL_CALENDAR_PROVIDERS,
  externalCalendarProvider,
  parseExternalCalendarProvider,
} from '../src/calendar/externalCalendars';

test('offers Google and Apple calendar setup choices', () => {
  assert.deepEqual(EXTERNAL_CALENDAR_PROVIDERS.map(({ id }) => id), ['google', 'apple']);
  assert.equal(externalCalendarProvider('google').method, 'iCalendar 공유 링크 · 읽기 전용');
  assert.match(externalCalendarProvider('google').summary, /비공개 또는 공개/);
  assert.match(externalCalendarProvider('google').caution, /캘린더 열람 권한과 같습니다/);
  assert.match(externalCalendarProvider('apple').caution, /링크를 아는 누구나 볼 수 있습니다/);
});

test('accepts only supported stored calendar providers', () => {
  assert.equal(parseExternalCalendarProvider('google'), 'google');
  assert.equal(parseExternalCalendarProvider('apple'), 'apple');
  assert.equal(parseExternalCalendarProvider('outlook'), null);
  assert.equal(parseExternalCalendarProvider(null), null);
});
