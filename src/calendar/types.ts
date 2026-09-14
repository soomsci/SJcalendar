export type EventKind = 'academic' | 'assessment' | 'activity' | 'holiday' | 'personal' | 'external';
export type CalendarView = 'list' | 'month' | 'week';
export type ExternalCalendarProvider = 'google' | 'apple';

export interface DateRange {
  from: string;
  to: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  kind: EventKind;
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  description?: string;
  source?: 'school' | 'personal' | 'external';
  externalProvider?: ExternalCalendarProvider;
}
