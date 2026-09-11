import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  datesInRange,
  eventsForDate,
  eventsForSevenDays,
  monthViewRange,
  overlapsRange,
  seoulToday,
  shiftViewAnchor,
  startOfWeek,
  viewRange,
} from '../src/calendar/events';
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

test('builds Monday-based week and six-row month ranges across month boundaries', () => {
  assert.equal(startOfWeek('2026-09-06'), '2026-08-31');
  assert.deepEqual(viewRange('week', '2026-09-10'), { from: '2026-09-07', to: '2026-09-13' });
  assert.deepEqual(monthViewRange('2026-09-10'), { from: '2026-08-31', to: '2026-10-11' });
  assert.equal(datesInRange('2026-08-31', '2026-10-11').length, 42);
});

test('moves calendar views by their natural period and expands spanning events per day', () => {
  assert.equal(shiftViewAnchor('month', '2026-12-10', 1), '2027-01-01');
  assert.equal(shiftViewAnchor('week', '2026-09-10', -1), '2026-09-03');
  assert.deepEqual(eventsForDate([spanning], '2026-09-08').map(({ id }) => id), ['break']);
});
