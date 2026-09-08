import type { CalendarEvent } from '../calendar/types';

export const mockEvents: CalendarEvent[] = [
  { id: 'mock-assembly', title: '전교 조회', kind: 'academic', date: '2026-09-08', endDate: null, allDay: false, startTime: '08:40', endTime: '09:00', description: '강당' },
  { id: 'mock-meeting', title: '교직원 회의', kind: 'activity', date: '2026-09-08', endDate: null, allDay: false, startTime: '15:30', endTime: '16:30', description: '시청각실' },
  { id: 'mock-assessment', title: '2학기 지필평가', kind: 'assessment', date: '2026-09-10', endDate: '2026-09-11', allDay: true, startTime: null, endTime: null },
  { id: 'mock-holiday', title: '추석 연휴', kind: 'holiday', date: '2026-09-24', endDate: '2026-09-26', allDay: true, startTime: null, endTime: null },
];
