import type { CalendarEvent, EventKind } from '../calendar/types';

const labels: Record<EventKind, string> = { academic: '학사', assessment: '평가', activity: '교육·행사', holiday: '휴업·방학' };

export function EventRow({ event, onSelect }: { event: CalendarEvent; onSelect: (event: CalendarEvent) => void }) {
  const time = event.allDay ? '하루 종일' : `${event.startTime}${event.endTime ? `–${event.endTime}` : ''}`;
  return <button className={`event event--${event.kind}`} onClick={() => onSelect(event)}>
    <span className="event__kind">{labels[event.kind]}</span><span className="event__title">{event.title}</span><span className="event__time">{time}</span>
  </button>;
}
