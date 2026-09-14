import { useState } from 'react';
import type { FormEvent } from 'react';
import { personalEventError, type PersonalEvent, type PersonalEventInput } from '../calendar/personalEvents';
import { seoulToday } from '../calendar/events';

interface PersonalEventDialogProps {
  initial: PersonalEvent | null;
  saving: boolean;
  storageError: string | null;
  onCancel: () => void;
  onSave: (input: PersonalEventInput) => Promise<void>;
}

export function PersonalEventDialog({ initial, saving, storageError, onCancel, onSave }: PersonalEventDialogProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? seoulToday());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [allDay, setAllDay] = useState(initial?.allDay ?? true);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: PersonalEventInput = {
      title,
      date,
      endDate: endDate || null,
      allDay,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      description,
    };
    const error = personalEventError(input);
    setValidationError(error);
    if (error) return;
    await onSave(input);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="personal-event-title">
      <form className="personal-form" onSubmit={submit}>
        <button type="button" className="close" onClick={onCancel} aria-label="닫기">×</button>
        <p className="eyebrow">이 PC에만 저장</p>
        <h2 id="personal-event-title">{initial ? '개인 일정 수정' : '개인 일정 추가'}</h2>

        <label>제목<input autoFocus maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="form-row">
          <label>시작 날짜<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>종료 날짜<input type="date" min={date} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>
        <label className="checkbox"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />하루 종일</label>
        {!allDay && <div className="form-row">
          <label>시작 시간<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label>종료 시간<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
        </div>}
        <label>메모<textarea maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <p className="local-only-note">개인 일정은 SJOWS 서버로 전송되지 않으며 현재 Windows 사용자에게만 저장됩니다.</p>
        {(validationError || storageError) && <p className="form-error" role="alert">{validationError ?? storageError}</p>}
        <div className="form-actions">
          <button type="button" onClick={onCancel}>취소</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </div>
  );
}
