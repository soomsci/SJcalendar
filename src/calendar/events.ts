import type { CalendarEvent } from './types';

const SEOUL = 'Asia/Seoul';
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: SEOUL, year: 'numeric', month: '2-digit', day: '2-digit' });

export function seoulToday(now = new Date()): string {
  const fields = Object.fromEntries(dateFormat.formatToParts(now).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function eventEnds(event: CalendarEvent): string { return event.endDate ?? event.date; }

export function overlapsRange(event: CalendarEvent, from: string, to: string): boolean {
  return event.date <= to && eventEnds(event) >= from;
}

export function orderEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) =>
    a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title, 'ko'),
  );
}

export function eventsForSevenDays(events: CalendarEvent[], today: string): CalendarEvent[] {
  return orderEvents(events.filter((event) => overlapsRange(event, today, addDays(today, 6))));
}

export function formatKoreanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', { timeZone: SEOUL, month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
