import { createStore, type Store } from '@tauri-apps/plugin-store';
import { orderEvents } from './events';
import type { CalendarEvent } from './types';

const STORE_PATH = 'personal-events.json';
const STORE_KEY = 'personalEvents';
const STORE_SCHEMA_VERSION = 1;
const MAX_PERSONAL_EVENTS = 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface PersonalEvent extends CalendarEvent {
  kind: 'personal';
  source: 'personal';
  updatedAt: string;
}

export interface PersonalEventInput {
  title: string;
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  description?: string;
}

interface StoredPersonalEvents {
  schemaVersion: 1;
  events: PersonalEvent[];
}

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  storePromise ??= createStore(STORE_PATH, { autoSave: false });
  return storePromise;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

export function personalEventError(input: PersonalEventInput): string | null {
  const title = input.title.trim();
  if (!title) return '제목을 입력해 주세요.';
  if (title.length > 120) return '제목은 120자 이하로 입력해 주세요.';
  if (!validDate(input.date)) return '시작 날짜를 확인해 주세요.';
  if (input.endDate && !validDate(input.endDate)) return '종료 날짜를 확인해 주세요.';
  if (input.endDate && input.endDate < input.date) return '종료 날짜는 시작 날짜보다 빠를 수 없습니다.';
  if (!input.allDay && !validTime(input.startTime)) return '시작 시간을 입력해 주세요.';
  if (!input.allDay && input.endTime && !validTime(input.endTime)) return '종료 시간을 확인해 주세요.';
  if (!input.allDay && input.endTime && (!input.endDate || input.endDate === input.date) && input.startTime && input.endTime <= input.startTime) {
    return '같은 날 일정의 종료 시간은 시작 시간보다 늦어야 합니다.';
  }
  if ((input.description ?? '').trim().length > 500) return '메모는 500자 이하로 입력해 주세요.';
  return null;
}

export function createPersonalEvent(
  input: PersonalEventInput,
  existingId?: string,
  now = new Date(),
): PersonalEvent {
  const validationError = personalEventError(input);
  if (validationError) throw new Error(validationError);
  return {
    id: existingId ?? `local-${crypto.randomUUID()}`,
    source: 'personal',
    kind: 'personal',
    title: input.title.trim(),
    date: input.date,
    endDate: input.endDate || null,
    allDay: input.allDay,
    startTime: input.allDay ? null : input.startTime,
    endTime: input.allDay ? null : input.endTime,
    description: input.description?.trim() || undefined,
    updatedAt: now.toISOString(),
  };
}

export function isPersonalEvent(value: unknown): value is PersonalEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<PersonalEvent>;
  if (typeof event.id !== 'string' || !event.id.startsWith('local-')) return false;
  if (event.kind !== 'personal' || event.source !== 'personal' || typeof event.updatedAt !== 'string') return false;
  return personalEventError({
    title: typeof event.title === 'string' ? event.title : '',
    date: typeof event.date === 'string' ? event.date : '',
    endDate: typeof event.endDate === 'string' ? event.endDate : null,
    allDay: event.allDay === true,
    startTime: typeof event.startTime === 'string' ? event.startTime : null,
    endTime: typeof event.endTime === 'string' ? event.endTime : null,
    description: typeof event.description === 'string' ? event.description : undefined,
  }) === null;
}

export function upsertPersonalEvent(events: PersonalEvent[], event: PersonalEvent): PersonalEvent[] {
  const next = [...events.filter(({ id }) => id !== event.id), event];
  return orderEvents(next) as PersonalEvent[];
}

export function removePersonalEvent(events: PersonalEvent[], id: string): PersonalEvent[] {
  return events.filter((event) => event.id !== id);
}

export async function loadPersonalEvents(): Promise<PersonalEvent[]> {
  const store = await getStore();
  const stored = await store.get<StoredPersonalEvents>(STORE_KEY);
  if (!stored || stored.schemaVersion !== STORE_SCHEMA_VERSION || !Array.isArray(stored.events)) return [];
  return orderEvents(stored.events.filter(isPersonalEvent)).slice(0, MAX_PERSONAL_EVENTS) as PersonalEvent[];
}

export async function savePersonalEvents(events: PersonalEvent[]): Promise<void> {
  const sanitized = events.filter(isPersonalEvent).slice(0, MAX_PERSONAL_EVENTS);
  const store = await getStore();
  await store.set(STORE_KEY, { schemaVersion: STORE_SCHEMA_VERSION, events: sanitized } satisfies StoredPersonalEvents);
  await store.save();
}
