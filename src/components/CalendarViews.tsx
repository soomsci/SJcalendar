import {
  addDays,
  datesInRange,
  eventsForDate,
  formatKoreanDate,
  monthViewRange,
  startOfWeek,
} from '../calendar/events';
import type { CalendarEvent, CalendarView } from '../calendar/types';
import { EventRow } from './EventRow';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

interface CalendarViewsProps {
  view: CalendarView;
  anchor: string;
  today: string;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
}

function EventChip({ event, onSelect }: { event: CalendarEvent; onSelect: (event: CalendarEvent) => void }) {
  return (
    <button
      className={`event-chip event-chip--${event.kind}`}
      onClick={() => onSelect(event)}
      title={event.title}
    >
      {!event.allDay && event.startTime && <time>{event.startTime}</time>}
      <span>{event.title}</span>
    </button>
  );
}

function ListView({ anchor, today, events, onSelect }: Omit<CalendarViewsProps, 'view'>) {
  const dates = datesInRange(anchor, addDays(anchor, 6));
  const rows = dates
    .map((date) => ({ date, items: eventsForDate(events, date) }))
    .filter(({ date, items }) => date === today || items.length > 0);

  return (
    <div className="list-view">
      {rows.length ? rows.map(({ date, items }) => (
        <section className={`day-list${date === today ? ' day-list--today' : ''}`} key={date}>
          <h3>{date === today ? '오늘 · ' : ''}{formatKoreanDate(date)}</h3>
          {items.length
            ? items.map((event) => <EventRow key={`${date}-${event.id}`} event={event} onSelect={onSelect} />)
            : <p className="empty">등록된 일정이 없습니다</p>}
        </section>
      )) : <p className="empty empty--range">이 기간에 등록된 일정이 없습니다</p>}
    </div>
  );
}

function MonthView({ anchor, today, events, onSelect }: Omit<CalendarViewsProps, 'view'>) {
  const range = monthViewRange(anchor);
  const dates = datesInRange(range.from, range.to);
  const currentMonth = anchor.slice(0, 7);

  return (
    <div className="month-scroll">
      <div className="month-grid" role="grid" aria-label="월간 일정">
        {WEEKDAYS.map((weekday, index) => <div className={`weekday weekday--${index}`} role="columnheader" key={weekday}>{weekday}</div>)}
        {dates.map((date) => {
          const items = eventsForDate(events, date);
          return (
            <section
              className={`month-cell${date.slice(0, 7) !== currentMonth ? ' month-cell--outside' : ''}${date === today ? ' month-cell--today' : ''}`}
              role="gridcell"
              key={date}
            >
              <strong className="month-cell__day">{Number(date.slice(8))}</strong>
              <div className="month-cell__events">
                {items.map((event) => <EventChip key={`${date}-${event.id}`} event={event} onSelect={onSelect} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, today, events, onSelect }: Omit<CalendarViewsProps, 'view'>) {
  const from = startOfWeek(anchor);
  const dates = datesInRange(from, addDays(from, 6));

  return (
    <div className="week-scroll">
      <div className="week-grid" role="grid" aria-label="주간 일정">
        {dates.map((date, index) => {
          const items = eventsForDate(events, date);
          return (
            <section className={`week-column${date === today ? ' week-column--today' : ''}`} role="gridcell" key={date}>
              <header><span>{WEEKDAYS[index]}</span><strong>{Number(date.slice(8))}</strong></header>
              <div className="week-column__events">
                {items.length
                  ? items.map((event) => <EventChip key={`${date}-${event.id}`} event={event} onSelect={onSelect} />)
                  : <p className="week-empty">일정 없음</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarViews(props: CalendarViewsProps) {
  if (props.view === 'month') return <MonthView {...props} />;
  if (props.view === 'week') return <WeekView {...props} />;
  return <ListView {...props} />;
}
