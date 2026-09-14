import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPersonalEvent,
  isPersonalEvent,
  personalEventError,
  removePersonalEvent,
  upsertPersonalEvent,
} from '../src/calendar/personalEvents';
import type { PersonalEventInput } from '../src/calendar/personalEvents';

const allDayInput: PersonalEventInput = {
  title: '  개인 약속  ',
  date: '2026-09-12',
  endDate: null,
  allDay: true,
  startTime: '09:00',
  endTime: '10:00',
  description: '  준비물 확인  ',
};

test('creates a sanitized personal-only event without school-event fields', () => {
  const event = createPersonalEvent(allDayInput, 'local-test', new Date('2026-09-11T00:00:00Z'));
  assert.deepEqual(event, {
    id: 'local-test',
    source: 'personal',
    kind: 'personal',
    title: '개인 약속',
    date: '2026-09-12',
    endDate: null,
    allDay: true,
    startTime: null,
    endTime: null,
    description: '준비물 확인',
    updatedAt: '2026-09-11T00:00:00.000Z',
  });
  assert.equal(isPersonalEvent(event), true);
});

test('rejects invalid dates and reversed same-day times', () => {
  assert.equal(personalEventError({ ...allDayInput, date: '2026-02-30' }), '시작 날짜를 확인해 주세요.');
  assert.equal(personalEventError({
    ...allDayInput,
    allDay: false,
    startTime: '11:00',
    endTime: '10:00',
  }), '같은 날 일정의 종료 시간은 시작 시간보다 늦어야 합니다.');
});

test('updates and removes only the selected local event', () => {
  const first = createPersonalEvent(allDayInput, 'local-first');
  const updated = createPersonalEvent({ ...allDayInput, title: '수정됨' }, 'local-first');
  const second = createPersonalEvent({ ...allDayInput, title: '둘째', date: '2026-09-13' }, 'local-second');
  const events = upsertPersonalEvent(upsertPersonalEvent([first], second), updated);
  assert.deepEqual(events.map(({ title }) => title), ['수정됨', '둘째']);
  assert.deepEqual(removePersonalEvent(events, 'local-first').map(({ id }) => id), ['local-second']);
});

test('never treats a school event as local personal data', () => {
  assert.equal(isPersonalEvent({
    id: 'school-1',
    source: 'school',
    kind: 'academic',
    title: '학교 행사',
    date: '2026-09-12',
    endDate: null,
    allDay: true,
    startTime: null,
    endTime: null,
    updatedAt: '2026-09-11T00:00:00.000Z',
  }), false);
});
