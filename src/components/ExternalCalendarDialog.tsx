import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  EXTERNAL_CALENDAR_PROVIDERS,
  externalCalendarProvider,
  type ExternalCalendarProviderId,
} from '../calendar/externalCalendars';

interface ExternalCalendarDialogProps {
  initialProvider: ExternalCalendarProviderId | null;
  onCancel: () => void;
  onSave: (provider: ExternalCalendarProviderId) => void;
}

export function ExternalCalendarDialog({
  initialProvider,
  onCancel,
  onSave,
}: ExternalCalendarDialogProps) {
  const [selected, setSelected] = useState<ExternalCalendarProviderId>(initialProvider ?? 'google');
  const [openError, setOpenError] = useState<string | null>(null);
  const provider = externalCalendarProvider(selected);

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
          복잡한 계정 인증 대신 읽기 전용 iCalendar 공유 링크를 사용합니다. 현재 버전은 연동 대상을
          저장하고 링크를 만드는 방법을 안내하며, 실제 일정 가져오기는 공유 링크 구독 기능이 추가된 뒤 사용할 수 있습니다.
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
            <span className="setup-badge">공유 링크 준비</span>
          </div>

          <h4>준비할 것</h4>
          <ul>{provider.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
          <h4>연동 순서</h4>
          <ol>{provider.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="provider-caution"><strong>보안 안내</strong>{provider.caution}</p>
          {openError && <p className="form-error" role="alert">{openError}</p>}
          <button type="button" className="official-help" onClick={() => void openOfficialHelp()}>
            {provider.helpLabel}
          </button>
        </section>

        <div className="form-actions">
          <button type="button" onClick={onCancel}>취소</button>
          <button type="button" className="primary" onClick={() => onSave(selected)}>
            이 캘린더로 준비
          </button>
        </div>
      </div>
    </div>
  );
}
