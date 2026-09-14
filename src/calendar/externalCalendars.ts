export type ExternalCalendarProviderId = 'google' | 'apple';

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
    method: 'OAuth 2.0 · 읽기 전용',
    summary: '기본 브라우저에서 Google 계정을 선택하고 일정 보기 권한만 승인하는 방식입니다.',
    requirements: [
      'Google Calendar API가 활성화된 Google Cloud 프로젝트',
      'Windows 데스크톱 앱용 OAuth 클라이언트',
      'calendar.readonly 범위에 대한 동의 화면과 게시 설정',
    ],
    steps: [
      '관리자가 Google Cloud에서 Calendar API와 데스크톱 OAuth 클라이언트를 준비합니다.',
      '위젯의 연결 버튼이 기본 브라우저를 열면 사용할 Google 계정을 선택합니다.',
      '일정 보기 권한만 확인해 승인하면 위젯이 선택한 캘린더의 일정을 가져옵니다.',
      '갱신 토큰은 Windows 자격 증명 저장소에 보관하고 연결 해제 시 삭제합니다.',
    ],
    caution: '공개 배포 전에는 Google OAuth 앱 검증이 필요할 수 있습니다. 쓰기 권한은 요청하지 않습니다.',
    helpLabel: 'Google 공식 OAuth 안내 열기',
  },
  {
    id: 'apple',
    name: 'Apple Calendar (iCloud)',
    shortName: 'Apple',
    method: 'iCloud/CalDAV · 읽기 전용',
    summary: '지원되는 계정 데이터 접근 승인 또는 앱 전용 암호로 iCloud 캘린더를 읽는 방식입니다.',
    requirements: [
      'iCloud 캘린더를 사용하는 Apple 계정',
      'Apple 계정의 이중 인증',
      '계정 데이터 접근 승인이 불가능할 때 사용할 앱 전용 암호',
    ],
    steps: [
      'Apple 계정에 이중 인증이 설정되어 있는지 확인합니다.',
      '지원되는 승인 화면이 열리면 Apple 계정으로 접근을 허용합니다.',
      '승인 방식을 사용할 수 없으면 account.apple.com의 로그인 및 보안에서 앱 전용 암호를 생성합니다.',
      'Apple 계정 이메일과 앱 전용 암호는 Windows 자격 증명 저장소에만 보관합니다.',
    ],
    caution: 'Apple 계정의 기본 암호를 위젯에 입력하면 안 됩니다. 공개 캘린더 링크는 링크를 아는 누구나 볼 수 있어 비공개 일정에는 권장하지 않습니다.',
    helpLabel: 'Apple 공식 연동 안내 열기',
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
