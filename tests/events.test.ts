import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, eventsForSevenDays, overlapsRange, seoulToday } from '../src/calendar/events';
import type { CalendarEvent } from '../src/calendar/types';

const spanning: CalendarEvent = { id: 'break', title: '방학', kind: 'holiday', date: '2026-09-06', endDate: '2026-09-10', allDay: true, startTime: null, endTime: null };

test('uses Seoul calendar date regardless of machine timezone', () => {
  assert.equal(seoulToday(new Date('2026-09-07T15:30:00Z')), '2026-09-08');
});
test('includes a multi-day event when any day intersects the request range', () => {
  assert.equal(overlapsRange(spanning, '2026-09-08', '2026-09-14'), true);
  assert.equal(overlapsRange(spanning, '2026-09-11', '2026-09-14'), false);
});
test('sorts all-day events before timed events and retains ongoing events', () => {
  const timed: CalendarEvent = { ...spanning, id: 'timed', title: '회의', date: '2026-09-08', endDate: null, allDay: false, startTime: '15:30', endTime: null };
  const allDay: CalendarEvent = { ...spanning, id: 'all-day', title: '평가', date: '2026-09-08', endDate: null, allDay: true, startTime: null, endTime: null };
  assert.deepEqual(eventsForSevenDays([timed, allDay, spanning], '2026-09-08').map(({ id }) => id), ['break', 'all-day', 'timed']);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
