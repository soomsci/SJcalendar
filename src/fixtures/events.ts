import type { CalendarEvent } from '../calendar/types';
import { addDays } from '../calendar/events';

export function createMockEvents(today: string): CalendarEvent[] {
  return [
    {
      id: 'mock-counseling-week',
      title: '학생·학부모 상담 주간',
      kind: 'academic',
      date: addDays(today, -1),
      endDate: addDays(today, 2),
      allDay: true,
      startTime: null,
      endTime: null,
      description: '현재 진행 중인 여러 날 일정의 표시를 확인하기 위한 예시입니다.',
    },
    { id: 'mock-assembly', title: '전교 조회', kind: 'academic', date: today, endDate: null, allDay: false, startTime: '08:40', endTime: '09:00', description: '강당' },
    { id: 'mock-meeting', title: '교직원 회의', kind: 'activity', date: today, endDate: null, allDay: false, startTime: '15:30', endTime: '16:30', description: '시청각실' },
    { id: 'mock-open-class', title: '학부모 공개수업', kind: 'activity', date: addDays(today, 1), endDate: null, allDay: true, startTime: null, endTime: null },
    { id: 'mock-assessment', title: '2학기 지필평가', kind: 'assessment', date: addDays(today, 3), endDate: addDays(today, 4), allDay: true, startTime: null, endTime: null },
    { id: 'mock-training', title: '디지털 기반 수업 혁신 및 학생 맞춤형 교육과정 운영 연수', kind: 'activity', date: addDays(today, 5), endDate: null, allDay: false, startTime: '15:20', endTime: '16:40', description: '긴 일정 제목의 줄바꿈을 확인하기 위한 예시입니다.' },
    { id: 'mock-holiday', title: '재량휴업일', kind: 'holiday', date: addDays(today, 6), endDate: null, allDay: true, startTime: null, endTime: null },
  ];
}
