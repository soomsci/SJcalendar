import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  eventsForRange,
  formatKoreanDate,
  formatViewHeading,
  seoulToday,
  shiftViewAnchor,
  viewRange,
} from './calendar/events';
import type { CalendarEvent, CalendarView } from './calendar/types';
import { CalendarViews } from './components/CalendarViews';
import { WindowResizeHandles } from './components/WindowResizeHandles';
import './styles.css';

interface CommandError { code?: string; message?: string }
interface DeviceConnection { userCode: string; verificationUrl: string; expiresIn: number; interval: number }
interface PollStatus { status: 'pending' | 'connected'; retryAfter: number }
interface CalendarResponse { schemaVersion: number; timezone: string; generatedAt: string; events: CalendarEvent[] }
type ConnectionState = 'checking' | 'disconnected' | 'connecting' | 'pending' | 'connected' | 'offline' | 'error';

const VIEW_LABELS: Record<CalendarView, string> = { list: '목록', month: '월간', week: '주간' };

function savedView(): CalendarView {
  const value = window.localStorage.getItem('calendar-view');
  return value === 'month' || value === 'week' ? value : 'list';
}

function commandError(error: unknown): Required<CommandError> {
  if (error && typeof error === 'object') {
    const value = error as CommandError;
    return { code: value.code ?? 'UNKNOWN', message: value.message ?? '요청을 처리하지 못했습니다.' };
  }
  return { code: 'UNKNOWN', message: typeof error === 'string' ? error : '요청을 처리하지 못했습니다.' };
}

function errorMessage(error: unknown): string {
  const parsed = commandError(error);
  return parsed.code === 'UNKNOWN' ? parsed.message : `${parsed.message} (${parsed.code})`;
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function updatedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '방금 전' : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [today, setToday] = useState(() => seoulToday());
  const [anchor, setAnchor] = useState(() => seoulToday());
  const [view, setView] = useState<CalendarView>(savedView);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState('갱신 전');
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [connection, setConnection] = useState<DeviceConnection | null>(null);
  const [message, setMessage] = useState('저장된 로그인을 확인하고 있습니다.');
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  const requestInFlight = useRef(false);

  const range = useMemo(() => viewRange(view, anchor), [anchor, view]);
  const visibleEvents = useMemo(() => eventsForRange(events, range), [events, range]);
  const next = useMemo(
    () => eventsForRange(events, { from: today, to: '9999-12-31' })[0],
    [events, today],
  );
  const showCalendar = connectionState === 'connected' || connectionState === 'offline' || events.length > 0;

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    const currentToday = seoulToday();
    setToday(currentToday);
    try {
      const response = await invoke<CalendarResponse>('fetch_calendar', { from: range.from, to: range.to });
      if (response.schemaVersion !== 1 || response.timezone !== 'Asia/Seoul') {
        throw { code: 'INVALID_RESPONSE', message: '지원하지 않는 일정 형식입니다.' };
      }
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
      setMessage(errorMessage(rawError));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }, [events.length, range]);

  const startConnection = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setConnection(null);
    setConnectionState('connecting');
    setMessage('서버에 연결 코드를 요청하고 있습니다. 최대 15초 정도 걸릴 수 있습니다.');
    try {
      await nextPaint();
      const started = await invoke<DeviceConnection>('start_device_connection');
      setConnection(started);
      setConnectionState('pending');
      setMessage('브라우저에서 기기 연결을 승인해 주세요.');
      try {
        await invoke('open_connection_page', { url: started.verificationUrl });
      } catch (openError) {
        setConnectionState('error');
        setMessage(`${errorMessage(openError)} 아래 버튼으로 승인 페이지를 다시 열어 주세요.`);
      }
    } catch (rawError) {
      setConnectionState('error');
      setMessage(errorMessage(rawError));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await invoke('logout'); } catch { /* Clear local UI even when remote revocation is unavailable. */ }
    setEvents([]);
    setConnection(null);
    setSelected(null);
    setUpdatedAt('갱신 전');
    setConnectionState('disconnected');
    setMessage('로그아웃했습니다. 다시 연결하면 일정을 확인할 수 있습니다.');
  }, []);

  const changeView = (nextView: CalendarView) => {
    setView(nextView);
    window.localStorage.setItem('calendar-view', nextView);
  };

  const startWindowDrag = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    void getCurrentWindow().startDragging();
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    invoke<boolean>('has_saved_login')
      .then((saved) => {
        if (saved) return refresh();
        setConnectionState('disconnected');
        setMessage('학교 계정을 연결하면 최신 학사일정을 확인할 수 있습니다.');
      })
      .catch((error) => { setConnectionState('error'); setMessage(errorMessage(error)); });
  }, [refresh]);

  useEffect(() => {
    if (connectionState !== 'connected') return;
    void refresh();
  }, [range.from, range.to]);

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
          setMessage('연결되었습니다. 일정을 불러옵니다.');
          await refresh();
        } else {
          setConnection((current) => current ? { ...current, interval: result.retryAfter } : current);
        }
      } catch (error) {
        if (cancelled) return;
        setConnection(null);
        setConnectionState('error');
        setMessage(errorMessage(error));
      }
    }, connection.interval * 1000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [connection, connectionState, refresh]);

  useEffect(() => {
    const unlistenRefresh = listen('calendar://refresh', () => { void refresh(); });
    const unlistenLogout = listen('calendar://logout', () => { void logout(); });
    return () => { void unlistenRefresh.then((unlisten) => unlisten()); void unlistenLogout.then((unlisten) => unlisten()); };
  }, [logout, refresh]);

  return (
    <main className={collapsed ? 'widget widget--collapsed' : 'widget'}>
      <header className="header" onMouseDown={startWindowDrag}>
        <div>
          <p className="eyebrow">삼정중학교</p>
          <h1>{formatKoreanDate(today)}</h1>
        </div>
        <button className="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? '펼치기' : '접기'}>{collapsed ? '⌄' : '−'}</button>
      </header>

      {collapsed
        ? <section className="collapsed-next"><span>다음 일정</span><strong>{next?.title ?? '등록된 일정이 없습니다'}</strong></section>
        : <>
          {showCalendar && <section className="calendar-toolbar" aria-label="일정 보기 설정">
            <div className="view-tabs" role="tablist" aria-label="보기 방식">
              {(Object.keys(VIEW_LABELS) as CalendarView[]).map((mode) => (
                <button
                  aria-selected={view === mode}
                  className={view === mode ? 'is-active' : ''}
                  disabled={busy}
                  key={mode}
                  onClick={() => changeView(mode)}
                  role="tab"
                >{VIEW_LABELS[mode]}</button>
              ))}
            </div>
            <div className="period-nav">
              <button aria-label="이전 기간" disabled={busy} onClick={() => setAnchor((value) => shiftViewAnchor(view, value, -1))}>‹</button>
              <strong>{formatViewHeading(view, anchor)}</strong>
              <button aria-label="다음 기간" disabled={busy} onClick={() => setAnchor((value) => shiftViewAnchor(view, value, 1))}>›</button>
              <button className="today-button" disabled={busy} onClick={() => setAnchor(seoulToday())}>오늘</button>
            </div>
          </section>}

          {(connectionState === 'disconnected' || connectionState === 'connecting' || connectionState === 'pending' || connectionState === 'error') && events.length === 0 && <section className="connection" aria-live="polite">
            <h2>{connectionState === 'pending' ? '브라우저에서 연결 승인' : '학교 계정 연결'}</h2>
            <p>{message}</p>
            {connection && <strong className="connection__code">{connection.userCode}</strong>}
            {connection
              ? <button disabled={busy} onClick={() => { setConnectionState('pending'); void invoke('open_connection_page', { url: connection.verificationUrl }); }}>승인 페이지 다시 열기</button>
              : <button disabled={busy} onClick={() => void startConnection()}>{busy ? '연결 중…' : '학교 계정으로 연결'}</button>}
          </section>}

          {showCalendar && <section className="calendar-content">
            <CalendarViews view={view} anchor={anchor} today={today} events={visibleEvents} onSelect={setSelected} />
          </section>}

          {(connectionState === 'offline' || connectionState === 'error') && events.length > 0 && <p className="status" role="status">{message} 마지막으로 받은 일정을 표시합니다.</p>}

          <footer>
            <span>마지막 갱신: {updatedAt}</span>
            <button disabled={busy} onClick={() => void refresh()}>새로고침</button>
            <button onClick={() => void invoke('open_office_calendar')}>교무실 열기</button>
          </footer>
        </>}

      {selected && <div className="modal" role="dialog" aria-modal="true" aria-label="일정 상세"><div><button className="close" onClick={() => setSelected(null)} aria-label="닫기">×</button><p className="eyebrow">일정 상세</p><h2>{selected.title}</h2><p>{formatKoreanDate(selected.date)}{selected.endDate ? ` ~ ${formatKoreanDate(selected.endDate)}` : ''}</p><p>{selected.allDay ? '하루 종일' : `${selected.startTime}${selected.endTime ? `–${selected.endTime}` : ''}`}</p>{selected.description && <p>{selected.description}</p>}<button onClick={() => void invoke('open_office_calendar')}>교무실에서 보기</button></div></div>}
      <WindowResizeHandles />
    </main>
  );
}
