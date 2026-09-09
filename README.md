# 삼정 학사일정 위젯

Windows 11 교직원용 학사일정 바탕화면 위젯의 초기 시제품이다. 현재 서울 기준 오늘과 향후 7일의 모의 일정, 일정 상세, 접기, 새로고침, 밝은 화면·어두운 화면을 제공한다. Tauri 앱에서는 트레이 표시·숨기기, 항상 위, 사용자가 선택하는 자동 실행, 단일 실행, 창 위치·크기 복원을 연결했다.

서버 API, 기기 연결, 인증 저장소, 운영 DB 연결은 아직 구현하지 않았다. 화면에는 모의 데이터임을 표시하고 교무실 열기 버튼도 비활성화해 미구현 연동을 실제 기능처럼 보이지 않게 한다.

## 실행

Node.js와 npm을 설치한 뒤 `npm install`, `npm run dev`를 실행한다. Tauri 개발 실행은 Rust 1.77.2 이상과 Windows용 Tauri 선행 조건을 설치한 뒤 `npm run tauri dev`를 사용한다.

## 검증

`npm test`는 서울 날짜 계산, 여러 날 일정의 범위 겹침, 하루 종일 우선 정렬과 연도 경계를 확인한다. `npm run build`는 TypeScript와 웹 번들을 함께 검증한다. Windows 실기기 확인 항목은 [docs/WINDOWS_BEHAVIOR.md](docs/WINDOWS_BEHAVIOR.md)에 기록한다.

서버 연동의 예정 계약은 [docs/API_CONTRACT.md](docs/API_CONTRACT.md)에 있다. 서버는 기본 일정과 DB 수정값을 같은 순수 결합 함수로 처리해야 하며, 이 저장소는 DB 접속 정보나 운영 비밀값을 포함하지 않는다.
