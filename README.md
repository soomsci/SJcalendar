# 삼정 학사일정 위젯

Windows 11 교직원용 학사일정 바탕화면 위젯의 초기 시제품이다. 현재는 모의 일정으로 오늘과 향후 7일, 일정 상세, 접기, 새로고침 화면을 제공한다. 서버 API, 기기 연결, 인증 저장소, 운영 DB 연결은 아직 구현하지 않았으며 교무실 열기 버튼도 이를 분명히 하기 위해 비활성화되어 있다.

## 실행

Node.js와 npm을 설치한 뒤 `npm install`, `npm run dev`를 실행한다. Tauri 개발·Windows 설치 파일 빌드에는 별도의 Rust 도구 체인과 Windows 환경이 필요하다.

## 검증

`npm test`는 Seoul 날짜 계산, 여러 날 일정의 범위 겹침, 하루 종일 우선 정렬과 연도 경계를 확인한다. Windows 실기기 확인 항목은 [docs/WINDOWS_BEHAVIOR.md](docs/WINDOWS_BEHAVIOR.md)에 기록한다.

서버 연동의 예정 계약은 [docs/API_CONTRACT.md](docs/API_CONTRACT.md)에 있다. 서버는 기본 일정과 DB 수정값을 같은 순수 결합 함수로 처리해야 하며, 이 저장소는 DB 접속 정보나 운영 비밀값을 포함하지 않는다.
