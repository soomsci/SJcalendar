# 삼정 학사일정 위젯

Windows 11 교직원용 학사일정 바탕화면 위젯이다. 온라인 교무실(`https://sjows.vercel.app`)과
일회용 기기 코드로 연결해 목록·월간·주간 일정, 일정 상세, 접기, 새로고침 화면을 제공한다.
공용 API 키나 DB 연결 정보는 앱에 넣지 않으며 갱신 토큰은 Windows 자격 증명 저장소에 보관한다.

창 상단을 끌어 위치를 옮길 수 있고, 네 모서리와 가장자리를 끌어 크기를 조절할 수 있다. 선택한
보기 방식은 다음 실행에도 유지된다.

## 실행

Node.js와 npm을 설치한 뒤 `npm install`, `npm run dev`를 실행한다. Tauri 개발·Windows 설치 파일 빌드에는 별도의 Rust 도구 체인과 Windows 환경이 필요하다.

## 검증

`npm test`는 Seoul 날짜 계산, 여러 날 일정의 범위 겹침, 하루 종일 우선 정렬, 주·월 범위와 연도
경계를 확인한다. Windows 실기기 확인 항목은 [docs/WINDOWS_BEHAVIOR.md](docs/WINDOWS_BEHAVIOR.md)에 기록한다.

서버 연동 계약은 [docs/API_CONTRACT.md](docs/API_CONTRACT.md)에 있다. 이 저장소는 DB 접속 정보나
운영 비밀값을 포함하지 않는다.
