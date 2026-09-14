import type { CalendarEvent, CalendarView, DateRange } from './types';

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

export function startOfWeek(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function monthViewRange(date: string): DateRange {
  const [year, month] = date.split('-').map(Number);
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const from = startOfWeek(firstDay);
  return { from, to: addDays(from, 41) };
}

export function viewRange(view: CalendarView, anchor: string): DateRange {
  if (view === 'month') return monthViewRange(anchor);
  const from = view === 'week' ? startOfWeek(anchor) : anchor;
  return { from, to: addDays(from, 6) };
}

export function shiftViewAnchor(view: CalendarView, anchor: string, amount: number): string {
  if (view !== 'month') return addDays(anchor, amount * 7);
  const [year, month] = anchor.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 10);
}

export function datesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to && dates.length < 93; date = addDays(date, 1)) dates.push(date);
  return dates;
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

export function eventsForRange(events: CalendarEvent[], range: DateRange): CalendarEvent[] {
  return orderEvents(events.filter((event) => overlapsRange(event, range.from, range.to)));
}

export function eventsForDate(events: CalendarEvent[], date: string): CalendarEvent[] {
  return orderEvents(events.filter((event) => overlapsRange(event, date, date)));
}

export function eventsForSevenDays(events: CalendarEvent[], today: string): CalendarEvent[] {
  return eventsForRange(events, { from: today, to: addDays(today, 6) });
}

export function formatKoreanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', { timeZone: SEOUL, month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatViewHeading(view: CalendarView, anchor: string): string {
  if (view === 'month') {
    const [year, month] = anchor.split('-').map(Number);
    return `${year}년 ${month}월`;
  }
  const range = viewRange(view, anchor);
  const short = (date: string) => {
    const [, month, day] = date.split('-').map(Number);
    return `${month}.${String(day).padStart(2, '0')}`;
  };
  return `${short(range.from)} – ${short(range.to)}`;
}
