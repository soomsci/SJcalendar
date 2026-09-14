import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  EXTERNAL_CALENDAR_PROVIDERS,
  externalCalendarProvider,
  type ExternalCalendarProviderId,
} from '../calendar/externalCalendars';

interface ExternalCalendarDialogProps {
  initialProvider: ExternalCalendarProviderId | null;
  connectedProvider: ExternalCalendarProviderId | null;
  connecting: boolean;
  connectionError: string | null;
  onCancel: () => void;
  onConnect: (provider: ExternalCalendarProviderId, url: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ExternalCalendarDialog({
  initialProvider,
  connectedProvider,
  connecting,
  connectionError,
  onCancel,
  onConnect,
  onDisconnect,
}: ExternalCalendarDialogProps) {
  const [selected, setSelected] = useState<ExternalCalendarProviderId>(initialProvider ?? 'google');
  const [url, setUrl] = useState('');
  const [openError, setOpenError] = useState<string | null>(null);
  const provider = externalCalendarProvider(selected);
  const selectedIsConnected = connectedProvider === selected;

  const openOfficialHelp = async () => {
    setOpenError(null);
    try {
      await invoke('open_calendar_help', { provider: selected });
    } catch {
      setOpenError('공식 안내 페이지를 열지 못했습니다. 네트워크와 기본 브라우저 설정을 확인해 주세요.');
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="external-calendar-title">
      <div className="external-calendar-dialog">
        <button type="button" className="close" onClick={onCancel} aria-label="닫기">×</button>
        <p className="eyebrow">외부 캘린더</p>
        <h2 id="external-calendar-title">공유 링크로 캘린더 연동</h2>
        <p className="external-calendar-intro">
          복잡한 계정 인증 대신 읽기 전용 iCalendar 공유 링크를 사용합니다. 링크를 등록하면 외부
          일정이 학교·개인 일정과 함께 표시되고 새로고침할 때 다시 동기화됩니다.
        </p>

        <div className="provider-options" role="radiogroup" aria-label="외부 캘린더 종류">
          {EXTERNAL_CALENDAR_PROVIDERS.map((option) => (
            <button
              type="button"
              role="radio"
              aria-checked={selected === option.id}
              className={`provider-option${selected === option.id ? ' is-selected' : ''}`}
              key={option.id}
              onClick={() => setSelected(option.id)}
            >
              <span className={`provider-mark provider-mark--${option.id}`} aria-hidden="true">
                {option.id === 'google' ? 'G' : 'A'}
              </span>
              <span><strong>{option.name}</strong><small>{option.method}</small></span>
            </button>
          ))}
        </div>

        <section className="provider-guide" aria-live="polite">
          <div className="provider-guide__heading">
            <div><h3>{provider.name}</h3><p>{provider.summary}</p></div>
            <span className={`setup-badge${selectedIsConnected ? ' setup-badge--connected' : ''}`}>
              {selectedIsConnected ? '연동됨' : '공유 링크 필요'}
            </span>
          </div>

          <h4>준비할 것</h4>
          <ul>{provider.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
          <h4>연동 순서</h4>
          <ol>{provider.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="provider-caution"><strong>보안 안내</strong>{provider.caution}</p>
          <button type="button" className="official-help" onClick={() => void openOfficialHelp()}>
            {provider.helpLabel}
          </button>
        </section>

        <form className="subscription-form" onSubmit={(event) => {
          event.preventDefault();
          void onConnect(selected, url);
        }}>
          <label>
            iCalendar 공유 링크
            <input
              autoComplete="off"
              disabled={connecting}
              inputMode="url"
              placeholder={selected === 'google' ? 'https://calendar.google.com/calendar/ical/…/basic.ics' : 'webcal://…icloud.com/published/2/…'}
              required
              spellCheck={false}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <p>공유 링크는 화면이나 설정 파일에 다시 표시하지 않고 Windows 보호 저장소에 보관합니다.</p>
          {(openError || connectionError) && <p className="form-error" role="alert">{openError ?? connectionError}</p>}
          <div className="form-actions">
            {connectedProvider && <button type="button" className="danger" disabled={connecting} onClick={() => void onDisconnect()}>연결 해제</button>}
            <button type="button" onClick={onCancel} disabled={connecting}>취소</button>
            <button type="submit" className="primary" disabled={connecting || !url.trim()}>
              {connecting ? '확인 중…' : selectedIsConnected ? '링크 변경' : '연동하기'}
            </button>
          </div>
        </form>
        <div className="visually-hidden" aria-live="polite">
          {selectedIsConnected ? `${provider.name} 공유 캘린더가 연결되었습니다.` : ''}
        </div>
      </div>
    </div>
  );
}
