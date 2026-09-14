import type { ExternalCalendarProvider as ExternalCalendarProviderId } from './types';

export type { ExternalCalendarProviderId };

export interface ExternalCalendarProvider {
  id: ExternalCalendarProviderId;
  name: string;
  shortName: string;
  method: string;
  summary: string;
  requirements: string[];
  steps: string[];
  caution: string;
  helpLabel: string;
}

export const EXTERNAL_CALENDAR_PROVIDERS: ExternalCalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    shortName: 'Google',
    method: 'iCalendar 공유 링크 · 읽기 전용',
    summary: 'Google Calendar의 비공개 또는 공개 iCal 주소를 위젯에 붙여 넣어 일정을 구독하는 방식입니다.',
    requirements: [
      'PC 웹 브라우저에서 열 수 있는 Google Calendar',
      '내 캘린더 또는 공유 관리 권한이 있는 캘린더',
      '캘린더 통합 메뉴의 iCal 형식 주소',
    ],
    steps: [
      'PC에서 Google Calendar를 열고 설정으로 이동합니다.',
      '내 캘린더의 설정에서 사용할 캘린더를 선택한 뒤 캘린더 통합을 엽니다.',
      '비공개 주소가 있으면 그 주소를, 공개 주소만 있으면 공개 주소(iCal 형식)를 복사합니다.',
      '공개 주소의 세부정보 보기가 비활성화되어 있으면 제목·설명이 제한될 수 있으며 Workspace 관리자 설정이 필요합니다.',
      '연동하기를 누르면 일정이 표시되고 새로고침할 때 공유 캘린더를 다시 읽습니다.',
    ],
    caution: '비공개 iCal 주소는 캘린더 열람 권한과 같습니다. 공개 주소 역시 외부에 노출될 수 있으므로 다른 사람에게 보내지 마세요. 조직 관리자가 세부정보 공개를 제한할 수도 있습니다.',
    helpLabel: 'Google 공식 공유 링크 안내 열기',
  },
  {
    id: 'apple',
    name: 'Apple Calendar (iCloud)',
    shortName: 'Apple',
    method: 'iCalendar 공개 링크 · 읽기 전용',
    summary: 'iCloud 캘린더를 공개 링크로 공유하고 위젯이 그 링크를 구독하는 방식입니다.',
    requirements: [
      'iCloud 캘린더를 사용하는 Apple 계정',
      '위젯용으로 따로 만든 비민감 캘린더',
      '공개 캘린더에서 생성한 공유 링크',
    ],
    steps: [
      'Apple Calendar에서 위젯에 표시할 별도 iCloud 캘린더를 만듭니다.',
      '캘린더 목록에서 정보 버튼을 누르고 공개 캘린더를 켭니다.',
      '링크 공유로 주소를 복사해 위젯 입력란에 붙여 넣습니다.',
      '연동하기를 누르면 일정이 표시되고 새로고침할 때 공유 캘린더를 다시 읽습니다.',
    ],
    caution: 'Apple 공개 캘린더는 링크를 아는 누구나 볼 수 있습니다. 비밀번호·학생 개인정보 등 민감한 일정은 넣지 말고, 필요 없어지면 공개 공유를 꺼야 합니다.',
    helpLabel: 'Apple 공식 캘린더 공유 안내 열기',
  },
];

export function externalCalendarProvider(
  id: ExternalCalendarProviderId,
): ExternalCalendarProvider {
  return EXTERNAL_CALENDAR_PROVIDERS.find((provider) => provider.id === id)
    ?? EXTERNAL_CALENDAR_PROVIDERS[0];
}

export function parseExternalCalendarProvider(
  value: string | null,
): ExternalCalendarProviderId | null {
  return value === 'google' || value === 'apple' ? value : null;
}
