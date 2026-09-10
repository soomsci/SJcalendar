import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { addDays, eventsForSevenDays, formatKoreanDate, seoulToday } from './calendar/events';
import type { CalendarEvent } from './calendar/types';
import { EventRow } from './components/EventRow';
import './styles.css';

interface CommandError { code?: string; message?: string }
interface DeviceConnection { userCode: string; verificationUrl: string; expiresIn: number; interval: number }
interface PollStatus { status: 'pending' | 'connected'; retryAfter: number }
interface CalendarResponse { schemaVersion: number; timezone: string; generatedAt: string; events: CalendarEvent[] }
type ConnectionState = 'checking' | 'disconnected' | 'connecting' | 'pending' | 'connected' | 'offline' | 'error';

function commandError(error: unknown): Required<CommandError> {
  if (error && typeof error === 'object') {
    const value = error as CommandError;
    return { code: value.code ?? 'UNKNOWN', message: value.message ?? '요청을 처리하지 못했습니다.' };
  }
  return { code: 'UNKNOWN', message: typeof error === 'string' ? error : '요청을 처리하지 못했습니다.' };
}

function updatedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '방금 전' : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [today, setToday] = useState(() => seoulToday());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState('갱신 전');
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [connection, setConnection] = useState<DeviceConnection | null>(null);
  const [message, setMessage] = useState('저장된 로그인을 확인하고 있습니다.');
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  const visibleEvents = useMemo(() => eventsForSevenDays(events, today), [events, today]);
  const todayEvents = visibleEvents.filter((event) => event.date <= today && (event.endDate ?? event.date) >= today);
  const byDate = visibleEvents.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    const date = event.date < today ? today : event.date;
    (groups[date] ??= []).push(event);
    return groups;
  }, {});
  const next = visibleEvents[0];

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const currentToday = seoulToday();
    setToday(currentToday);
    try {
      const response = await invoke<CalendarResponse>('fetch_calendar', { from: currentToday, to: addDays(currentToday, 6) });
      if (response.schemaVersion !== 1 || response.timezone !== 'Asia/Seoul') throw { code: 'INVALID_RESPONSE', message: '지원하지 않는 일정 형식입니다.' };
      setEvents(response.events);
      setUpdatedAt(updatedLabel(response.generatedAt));
      setConnectionState('connected');
      setMessage('온라인 교무실과 연결되었습니다.');
    } catch (rawError) {
      const error = commandError(rawError);
      if (error.code === 'AUTH_REQUIRED' || error.code === 'STAFF_REQUIRED') {
        setEvents([]);
        setConnectionState('disconnected');
      } else if (error.code === 'NETWORK_ERROR') {
        setConnectionState(events.length ? 'offline' : 'error');
      } else {
        setConnectionState('error');
      }
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }, [busy, events.length]);

  const startConnection = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setConnectionState('connecting');
    setMessage('연결 코드를 만들고 있습니다.');
    try {
      const started = await invoke<DeviceConnection>('start_device_connection');
      setConnection(started);
      setConnectionState('pending');
      setMessage('브라우저에서 기기 연결을 승인해 주세요.');
      await invoke('open_connection_page', { url: started.verificationUrl });
    } catch (rawError) {
      setConnectionState('error');
      setMessage(commandError(rawError).message);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const logout = useCallback(async () => {
    try { await invoke('logout'); } catch { /* Clear local UI even when remote revocation is unavailable. */ }
    setEvents([]);
    setConnection(null);
    setSelected(null);
    setUpdatedAt('갱신 전');
    setConnectionState('disconnected');
    setMessage('로그아웃했습니다. 다시 연결하면 일정을 확인할 수 있습니다.');
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    invoke<boolean>('has_saved_login')
      .then((saved) => {
        if (saved) return refresh();
        setConnectionState('disconnected');
        setMessage('학교 계정을 연결하면 최신 학사일정을 확인할 수 있습니다.');
      })
      .catch((error) => { setConnectionState('error'); setMessage(commandError(error).message); });
  }, [refresh]);

  useEffect(() => {
    if (connectionState !== 'connected') return;
    const delay = 5 * 60 * 1000 + Math.floor(Math.random() * 30_000);
    const timer = window.setTimeout(() => { void refresh(); }, delay);
    return () => window.clearTimeout(timer);
  }, [connectionState, refresh]);

  useEffect(() => {
    if (connectionState !== 'pending' || !connection) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await invoke<PollStatus>('poll_device_connection');
        if (cancelled) return;
        if (result.status === 'connected') {
          setConnection(null);
          setConnectionState('connected');
          setMessage('연결되었습니다. 일정을 불러옵니다.');
          await refresh();
        } else {
          setConnection((current) => current ? { ...current, interval: result.retryAfter } : current);
        }
      } catch (error) {
        if (cancelled) return;
        setConnection(null);
        setConnectionState('error');
        setMessage(commandError(error).message);
      }
    }, connection.interval * 1000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [connection, connectionState, refresh]);

  useEffect(() => {
    const unlistenRefresh = listen('calendar://refresh', () => { void refresh(); });
    const unlistenLogout = listen('calendar://logout', () => { void logout(); });
    return () => { void unlistenRefresh.then((unlisten) => unlisten()); void unlistenLogout.then((unlisten) => unlisten()); };
  }, [logout, refresh]);

  return <main className={collapsed ? 'widget widget--collapsed' : 'widget'}>
    <header data-tauri-drag-region className="header"><div><p className="eyebrow">삼정중학교</p><h1>{formatKoreanDate(today)}</h1></div><button className="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? '펼치기' : '접기'}>{collapsed ? '⌄' : '−'}</button></header>
    {collapsed ? <section className="collapsed-next"><span>다음 일정</span><strong>{next?.title ?? '등록된 일정이 없습니다'}</strong></section> : <>
      {(connectionState === 'disconnected' || connectionState === 'connecting' || connectionState === 'pending' || connectionState === 'error') && events.length === 0 && <section className="connection" aria-live="polite">
        <h2>{connectionState === 'pending' ? '브라우저에서 연결 승인' : '학교 계정 연결'}</h2>
        <p>{message}</p>
        {connection && <strong className="connection__code">{connection.userCode}</strong>}
        {connection ? <button disabled={busy} onClick={() => { setConnectionState('pending'); void invoke('open_connection_page', { url: connection.verificationUrl }); }}>승인 페이지 다시 열기</button> : <button disabled={busy} onClick={startConnection}>{busy ? '연결 중…' : '학교 계정으로 연결'}</button>}
      </section>}
      {events.length > 0 && <>
        <section className="today"><h2>오늘</h2>{todayEvents.length ? todayEvents.map((event) => <EventRow key={event.id} event={event} onSelect={setSelected} />) : <p className="empty">오늘 등록된 일정이 없습니다</p>}</section>
        <section className="upcoming"><h2>향후 7일</h2>{Object.entries(byDate).map(([date, items]) => <div className="day" key={date}><h3>{formatKoreanDate(date)}</h3>{items.map((event) => <EventRow key={event.id} event={event} onSelect={setSelected} />)}</div>)}</section>
      </>}
      {(connectionState === 'offline' || connectionState === 'error') && events.length > 0 && <p className="status" role="status">{message} 마지막으로 받은 일정을 표시합니다.</p>}
      <footer><span>마지막 갱신: {updatedAt}</span><button disabled={busy} onClick={refresh}>새로고침</button><button onClick={() => void invoke('open_office_calendar')}>교무실 열기</button></footer>
    </>}
    {selected && <div className="modal" role="dialog" aria-modal="true" aria-label="일정 상세"><div><button className="close" onClick={() => setSelected(null)} aria-label="닫기">×</button><p className="eyebrow">일정 상세</p><h2>{selected.title}</h2><p>{formatKoreanDate(selected.date)}{selected.endDate ? ` ~ ${formatKoreanDate(selected.endDate)}` : ''}</p><p>{selected.allDay ? '하루 종일' : `${selected.startTime}${selected.endTime ? `–${selected.endTime}` : ''}`}</p>{selected.description && <p>{selected.description}</p>}<button onClick={() => void invoke('open_office_calendar')}>교무실에서 보기</button></div></div>}
  </main>;
}
