import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExternalCalendarFeed } from '../src/calendar/icalFeed';

const feed = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//SJcalendar test//EN\r
BEGIN:VEVENT\r
UID:all-day\r
DTSTART;VALUE=DATE:20260914\r
DTEND;VALUE=DATE:20260916\r
SUMMARY:이틀 일정\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:utc-time\r
DTSTART:20260913T160000Z\r
DTEND:20260913T170000Z\r
SUMMARY:한국 새벽 일정\r
LOCATION:온라인\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:daily\r
DTSTART:20260914T000000Z\r
DTEND:20260914T003000Z\r
RRULE:FREQ=DAILY;COUNT=4\r
EXDATE:20260916T000000Z\r
SUMMARY:반복 일정\r
END:VEVENT\r
END:VCALENDAR\r
`;

test('parses all-day, Seoul-time, and recurring iCalendar events', () => {
  const events = parseExternalCalendarFeed(feed, 'google', { from: '2026-09-14', to: '2026-09-18' });

  const allDay = events.find(({ title }) => title === '이틀 일정');
  assert.deepEqual(allDay && {
    date: allDay.date,
    endDate: allDay.endDate,
    allDay: allDay.allDay,
    source: allDay.source,
  }, {
    date: '2026-09-14',
    endDate: '2026-09-15',
    allDay: true,
    source: 'external',
  });

  const timed = events.find(({ title }) => title === '한국 새벽 일정');
  assert.equal(timed?.date, '2026-09-14');
  assert.equal(timed?.startTime, '01:00');
  assert.equal(timed?.endTime, '02:00');
  assert.equal(timed?.description, '온라인');

  assert.deepEqual(
    events.filter(({ title }) => title === '반복 일정').map(({ date }) => date),
    ['2026-09-14', '2026-09-15', '2026-09-17'],
  );
});

test('rejects content that is not an iCalendar document', () => {
  assert.throws(
    () => parseExternalCalendarFeed('<html>login</html>', 'apple', { from: '2026-09-14', to: '2026-09-15' }),
    /iCalendar/,
  );
});
