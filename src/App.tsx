import { useMemo, useState } from 'react';
import { eventsForSevenDays, formatKoreanDate, seoulToday } from './calendar/events';
import type { CalendarEvent } from './calendar/types';
import { EventRow } from './components/EventRow';
import { mockEvents } from './fixtures/events';
import './styles.css';

const TODAY = seoulToday(new Date('2026-09-08T04:00:00Z'));

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [updatedAt, setUpdatedAt] = useState('방금 전');
  const events = useMemo(() => eventsForSevenDays(mockEvents, TODAY), []);
  const todayEvents = events.filter((event) => event.date <= TODAY && (event.endDate ?? event.date) >= TODAY);
  const byDate = events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    const date = event.date < TODAY ? TODAY : event.date; (groups[date] ??= []).push(event); return groups;
  }, {});
  const refresh = () => setUpdatedAt('방금 전 (모의 데이터)');
  const next = events[0];
  return <main className={collapsed ? 'widget widget--collapsed' : 'widget'}>
    <header data-tauri-drag-region className="header"><div><p className="eyebrow">삼정중학교</p><h1>{formatKoreanDate(TODAY)}</h1></div><button className="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? '펼치기' : '접기'}>{collapsed ? '⌄' : '−'}</button></header>
    {collapsed ? <section className="collapsed-next"><span>다음 일정</span><strong>{next?.title ?? '등록된 일정이 없습니다'}</strong></section> : <>
      <section className="today"><h2>오늘</h2>{todayEvents.length ? todayEvents.map((event) => <EventRow key={event.id} event={event} onSelect={setSelected} />) : <p className="empty">오늘 등록된 일정이 없습니다</p>}</section>
      <section className="upcoming"><h2>향후 7일</h2>{Object.entries(byDate).map(([date, items]) => <div className="day" key={date}><h3>{formatKoreanDate(date)}</h3>{items.map((event) => <EventRow key={event.id} event={event} onSelect={setSelected} />)}</div>)}</section>
      <footer><span>마지막 갱신: {updatedAt}</span><button onClick={refresh}>새로고침</button><button disabled title="교무실 연동 주소가 아직 설정되지 않았습니다">교무실 열기</button></footer>
    </>}
    {selected && <div className="modal" role="dialog" aria-modal="true" aria-label="일정 상세"><div><button className="close" onClick={() => setSelected(null)} aria-label="닫기">×</button><p className="eyebrow">일정 상세</p><h2>{selected.title}</h2><p>{formatKoreanDate(selected.date)}{selected.endDate ? ` ~ ${formatKoreanDate(selected.endDate)}` : ''}</p><p>{selected.allDay ? '하루 종일' : `${selected.startTime}–${selected.endTime}`}</p>{selected.description && <p>{selected.description}</p>}<button disabled title="교무실 연동 주소가 아직 설정되지 않았습니다">교무실에서 보기</button></div></div>}
  </main>;
}
