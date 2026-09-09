import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventsForSevenDays, formatKoreanDate, seoulToday } from './calendar/events';
import type { CalendarEvent } from './calendar/types';
import { EventRow } from './components/EventRow';
import { createMockEvents } from './fixtures/events';
import {
  hideWindow,
  isDesktopApp,
  readDesktopSettings,
  setAlwaysOnTop,
  setAutostart,
  setCollapsedWindow,
  subscribeToDesktopEvents,
} from './platform/desktop';
import './styles.css';

function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function App() {
  const [today, setToday] = useState(() => seoulToday());
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [notice, setNotice] = useState('모의 일정으로 화면 동작을 확인하고 있습니다.');
  const [autostart, setAutostartState] = useState(false);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(false);
  const [settingBusy, setSettingBusy] = useState(false);

  const events = useMemo(() => eventsForSevenDays(createMockEvents(today), today), [today]);
  const todayEvents = useMemo(
    () => events.filter((event) => event.date <= today && (event.endDate ?? event.date) >= today),
    [events, today],
  );
  const upcomingByDate = useMemo(
    () => events.filter((event) => event.date > today).reduce<Record<string, CalendarEvent[]>>((groups, event) => {
      (groups[event.date] ??= []).push(event);
      return groups;
    }, {}),
    [events, today],
  );
  const nextEvent = events[0];

  const refresh = useCallback(() => {
    setToday(seoulToday());
    setUpdatedAt(new Date());
    setNotice('모의 일정을 새로 불러왔습니다.');
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    if (collapsed) {
      setCollapsed(false);
      void setCollapsedWindow(false).catch(() => setNotice('설정 창 크기를 복원하지 못했습니다.'));
    }
  }, [collapsed]);

  useEffect(() => {
    const dateTimer = window.setInterval(() => setToday(seoulToday()), 60_000);
    const refreshTimer = window.setInterval(refresh, 5 * 60_000);
    return () => {
      window.clearInterval(dateTimer);
      window.clearInterval(refreshTimer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!selected && !settingsOpen) return;
    const closeDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settingsOpen) setSettingsOpen(false);
      else setSelected(null);
    };
    window.addEventListener('keydown', closeDialog);
    return () => window.removeEventListener('keydown', closeDialog);
  }, [selected, settingsOpen]);

  useEffect(() => {
    if (!isDesktopApp) return;
    readDesktopSettings()
      .then(({ autostart: enabled, alwaysOnTop: top }) => {
        setAutostartState(enabled);
        setAlwaysOnTopState(top);
      })
      .catch(() => setNotice('Windows 설정 상태를 읽지 못했습니다.'));
  }, []);

  async function updateAutostart(enabled: boolean) {
    setSettingBusy(true);
    try {
      await setAutostart(enabled);
      setAutostartState(enabled);
      setNotice(enabled ? 'Windows 로그인 시 자동 실행을 켰습니다.' : '자동 실행을 껐습니다.');
    } catch {
      setNotice('자동 실행 설정을 변경하지 못했습니다.');
    } finally {
      setSettingBusy(false);
    }
  }

  async function updateAlwaysOnTop(enabled: boolean) {
    setSettingBusy(true);
    try {
      await setAlwaysOnTop(enabled);
      setAlwaysOnTopState(enabled);
      setNotice(enabled ? '위젯을 다른 창 위에 표시합니다.' : '항상 위 표시를 껐습니다.');
    } catch {
      setNotice('항상 위 설정을 변경하지 못했습니다.');
    } finally {
      setSettingBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    subscribeToDesktopEvents({
      refresh,
      openSettings,
      logout: () => setNotice('로그인은 서버 연동 단계에서 제공됩니다.'),
      alwaysOnTopChanged: setAlwaysOnTopState,
      toggleAutostart: () => {
        void readDesktopSettings()
          .then(({ autostart: enabled }) => updateAutostart(!enabled))
          .catch(() => setNotice('자동 실행 설정을 읽지 못했습니다.'));
      },
    })
      .then((dispose) => {
        if (active) unsubscribe = dispose;
        else dispose();
      })
      .catch(() => setNotice('트레이 메뉴 연결을 초기화하지 못했습니다.'));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [openSettings, refresh]);

  async function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      await setCollapsedWindow(next);
    } catch {
      setNotice('창 크기를 변경하지 못했습니다.');
    }
  }

  return (
    <main className={collapsed ? 'widget widget--collapsed' : 'widget'}>
      <header data-tauri-drag-region className="header">
        <div data-tauri-drag-region>
          <p className="eyebrow">삼정중학교</p>
          <h1>{formatKoreanDate(today)}</h1>
        </div>
        <div className="window-actions">
          {!collapsed && <button className="icon" type="button" onClick={openSettings} aria-label="설정">⚙</button>}
          {isDesktopApp && !collapsed && <button className="icon" type="button" onClick={() => void hideWindow()} aria-label="트레이로 숨기기">×</button>}
          <button className="icon collapse-button" type="button" onClick={() => void toggleCollapsed()} aria-label={collapsed ? '펼치기' : '접기'}>{collapsed ? '⌄' : '−'}</button>
        </div>
      </header>

      {collapsed ? (
        <section className="collapsed-next" aria-live="polite">
          <span>다음 일정</span>
          <strong>{nextEvent?.title ?? '등록된 일정이 없습니다'}</strong>
        </section>
      ) : (
        <>
          <div className="source-banner"><span className="source-dot" />모의 데이터 · 서버 연동 전</div>
          <div className="content">
            <section className="today" aria-labelledby="today-heading">
              <div className="section-heading"><h2 id="today-heading">오늘</h2><span>{todayEvents.length}개</span></div>
              {todayEvents.length
                ? todayEvents.map((event) => <EventRow key={event.id} event={event} onSelect={setSelected} />)
                : <p className="empty">오늘 등록된 일정이 없습니다</p>}
            </section>
            <section className="upcoming" aria-labelledby="upcoming-heading">
              <div className="section-heading"><h2 id="upcoming-heading">향후 7일</h2><span>서울 기준</span></div>
              {Object.keys(upcomingByDate).length ? Object.entries(upcomingByDate).map(([date, items]) => (
                <div className="day" key={date}>
                  <h3>{formatKoreanDate(date)}</h3>
                  {items.map((event) => <EventRow key={event.id} event={event} onSelect={setSelected} />)}
                </div>
              )) : <p className="empty">다가오는 일정이 없습니다</p>}
            </section>
          </div>
          <p className="notice" aria-live="polite">{notice}</p>
          <footer>
            <span>마지막 갱신 {formatUpdatedAt(updatedAt)}</span>
            <button type="button" onClick={refresh}>새로고침</button>
            <button type="button" disabled title="교무실 연동 주소가 아직 설정되지 않았습니다">교무실 열기</button>
          </footer>
        </>
      )}

      {selected && (
        <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
            <button className="close" type="button" onClick={() => setSelected(null)} aria-label="닫기">×</button>
            <p className="eyebrow">일정 상세</p>
            <h2 id="event-dialog-title">{selected.title}</h2>
            <p>{formatKoreanDate(selected.date)}{selected.endDate && selected.endDate !== selected.date ? ` ~ ${formatKoreanDate(selected.endDate)}` : ''}</p>
            <p>{selected.allDay ? '하루 종일' : `${selected.startTime}${selected.endTime ? `–${selected.endTime}` : ''}`}</p>
            {selected.description && <p className="description">{selected.description}</p>}
            <button type="button" disabled title="교무실 연동 주소가 아직 설정되지 않았습니다">교무실에서 보기</button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSettingsOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
            <button className="close" type="button" onClick={() => setSettingsOpen(false)} aria-label="닫기">×</button>
            <p className="eyebrow">Windows 위젯</p>
            <h2 id="settings-dialog-title">설정</h2>
            <label className="setting-row">
              <span><strong>로그인 시 자동 실행</strong><small>선택한 경우에만 등록합니다.</small></span>
              <input type="checkbox" checked={autostart} disabled={!isDesktopApp || settingBusy} onChange={(event) => void updateAutostart(event.target.checked)} />
            </label>
            <label className="setting-row">
              <span><strong>항상 위</strong><small>다른 일반 창 위에 표시합니다.</small></span>
              <input type="checkbox" checked={alwaysOnTop} disabled={!isDesktopApp || settingBusy} onChange={(event) => void updateAlwaysOnTop(event.target.checked)} />
            </label>
            {!isDesktopApp && <p className="settings-note">자동 실행과 항상 위 설정은 Windows 앱에서 사용할 수 있습니다.</p>}
          </div>
        </div>
      )}
    </main>
  );
}
