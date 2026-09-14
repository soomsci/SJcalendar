import ICAL from 'ical.js';
import { addDays, orderEvents } from './events';
import type { CalendarEvent, DateRange, ExternalCalendarProvider } from './types';

const MAX_EXPANDED_EVENTS = 2000;
const MAX_RECURRENCE_ITERATIONS = 25_000;
const SEOUL_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type IcalTime = InstanceType<typeof ICAL.Time>;
type IcalEvent = InstanceType<typeof ICAL.Event>;

interface DateTimeParts {
  date: string;
  time: string | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localParts(value: IcalTime): DateTimeParts {
  if (value.isDate || value.zone?.tzid === 'floating') {
    return {
      date: `${value.year}-${pad(value.month)}-${pad(value.day)}`,
      time: value.isDate ? null : `${pad(value.hour)}:${pad(value.minute)}`,
    };
  }
  const parts = Object.fromEntries(
    SEOUL_PARTS.formatToParts(value.toJSDate())
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: part }) => [type, part]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function externalEvent(
  event: IcalEvent,
  start: IcalTime,
  end: IcalTime,
  provider: ExternalCalendarProvider,
): CalendarEvent {
  const startParts = localParts(start);
  const endParts = localParts(end);
  const allDay = start.isDate;
  const inclusiveEnd = allDay ? addDays(endParts.date, -1) : endParts.date;
  const endDate = inclusiveEnd > startParts.date ? inclusiveEnd : null;
  return {
    id: `external-${provider}-${event.uid || 'event'}-${startParts.date}-${startParts.time ?? 'all-day'}`,
    source: 'external',
    externalProvider: provider,
    kind: 'external',
    title: event.summary?.trim() || '제목 없는 일정',
    date: startParts.date,
    endDate,
    allDay,
    startTime: allDay ? null : startParts.time,
    endTime: allDay ? null : endParts.time,
    description: event.description?.trim() || event.location?.trim() || undefined,
  };
}

function intersects(event: CalendarEvent, range: DateRange): boolean {
  return event.date <= range.to && (event.endDate ?? event.date) >= range.from;
}

function isCancelled(event: IcalEvent): boolean {
  return event.component.getFirstPropertyValue('status') === 'CANCELLED';
}

export function parseExternalCalendarFeed(
  ical: string,
  provider: ExternalCalendarProvider,
  range: DateRange,
): CalendarEvent[] {
  let calendar: InstanceType<typeof ICAL.Component>;
  try {
    calendar = new ICAL.Component(ICAL.parse(ical));
  } catch {
    throw new Error('공유 캘린더 형식을 읽을 수 없습니다. iCalendar 공유 링크인지 확인해 주세요.');
  }

  const result: CalendarEvent[] = [];
  const recurrenceEnd = addDays(range.to, 1);

  for (const component of calendar.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(component);
    if (event.isRecurrenceException() || isCancelled(event)) continue;

    if (!event.isRecurring()) {
      const parsed = externalEvent(event, event.startDate, event.endDate, provider);
      if (intersects(parsed, range)) result.push(parsed);
      continue;
    }

    const iterator = event.iterator();
    let iterations = 0;
    let occurrence: IcalTime | null;
    while ((occurrence = iterator.next()) && iterations < MAX_RECURRENCE_ITERATIONS) {
      iterations += 1;
      const occurrenceDate = localParts(occurrence).date;
      if (occurrenceDate >= recurrenceEnd) break;
      const details = event.getOccurrenceDetails(occurrence);
      if (isCancelled(details.item)) continue;
      const parsed = externalEvent(
        details.item,
        details.startDate,
        details.endDate,
        provider,
      );
      if (intersects(parsed, range)) result.push(parsed);
      if (result.length >= MAX_EXPANDED_EVENTS) break;
    }
    if (result.length >= MAX_EXPANDED_EVENTS) break;
  }

  return orderEvents(result).slice(0, MAX_EXPANDED_EVENTS);
}
