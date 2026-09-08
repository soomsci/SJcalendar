export type EventKind = 'academic' | 'assessment' | 'activity' | 'holiday';

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
}
