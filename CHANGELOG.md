# CHANGELOG

FP AI Assistant의 버전별 변경 이력입니다.

---

## v0.9.0 — 2026-07-02

### 요금제 개편

- 요금제 가격 재조정: 기본 ₩2,900 / 프로 ₩6,900 / 프리미엄 ₩14,900
- 월 사용 한도 조정 (원가 최적화): 문자·스크립트·PDF 전 플랜 한도 축소
- 블로그·SNS 콘텐츠 및 뉴스레터 별도 쿼터 추가 (기존 스크립트 쿼터 공유에서 분리)
- `usage_records` 테이블에 `content_count`, `newsletter_count` 컬럼 추가 (migration 041)

### 문서화

- DEPLOYMENT.md, SECURITY.md, BACKUP_POLICY.md, BILLING_GUIDE.md 신규 작성
- ADMIN_GUIDE.md, USER_GUIDE.md, ROADMAP.md, INCIDENT_RESPONSE.md 신규 작성
- README.md 전면 개편 (신규 기능 반영, 마이그레이션 번호 최신화)

---

## v0.8.0 — 2026-06-30

### 보안 강화

- HTTP 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options, XSS Protection, Referrer-Policy, Permissions-Policy)
- `plans` 테이블 RLS 추가 (인증 사용자 읽기 전용)
- `/offline` 페이지 클라이언트 컴포넌트 전환 (prerender 오류 수정)
- 에러 메시지 내부 정보 노출 방지 강화 (files API)

### QA

- 보안 점검 15개 항목 전체 통과 확인
- 빌드 에러 전체 해소

---

## v0.7.0 — 2026-06-29

### 업무 캘린더 (`/calendar`)

- 오늘/주간/월간 3가지 뷰 구현
- 일정 유형 6종: 후속연락·미팅·생일·갱신·검토·기타
- 우선순위(낮음/보통/높음)별 색상 구분
- 월간 뷰 날짜 클릭으로 일정 추가 폼 자동 오픈
- 고객 연동: 일정에 고객 연결 및 고객 상세 페이지에서 캘린더 바로가기
- 후속 연락 SMS 바로가기 버튼
- Google Calendar 연동 준비 (`gcal_event_id`, `gcal_synced_at` 컬럼)
- `tasks` 테이블 및 API 구현 (migration 039)

---

## v0.6.0 — 2026-06-28

### 뉴스레터 생성 (`/newsletter`)

- 8섹션 월간 뉴스레터 AI 생성 (제목·인사말·시사이슈·체크포인트·CTA·카카오요약)
- 사용자 제공 참고자료 전용 입력 필드 (AI 할루시네이션 방지)
- 보관함 저장 및 TXT 다운로드
- `generated_outputs` 타입 제약 확장 (newsletter, content 추가, migration 038)

---

## v0.5.0 — 2026-06-27

### 블로그·SNS 콘텐츠 생성 (`/content-creator`)

- 6개 채널 동시 생성: 블로그 제목·본문, 인스타그램, 페이스북, 카카오채널, 해시태그
- 글 길이 선택 (짧게/보통/길게)
- 컴플라이언스 고지 자동 추가

---

## v0.4.0 — 2026-06-20

### 팀 관리 (`/team`)

- 팀 계정 생성, 멤버 초대·역할 관리
- 팀 관리자 전용 설정 페이지 (`/team/admin`)
- RLS 재귀 참조 이슈 수정 (migration 030)

### 고객 관리 (`/customers`)

- 고객 정보 등록·조회·수정·삭제
- 상호작용 이력 관리
- 후속 연락 SMS 바로 생성 연동

---

## v0.3.0 — 2026-06-15

### 템플릿 라이브러리 (`/templates`)

- 보험사별·상황별 AI 프롬프트 템플릿 제공
- 관리자 템플릿 등록·관리

### 빌링 구조 (`/billing`)

- 요금제 비교 카드 UI
- 구독 이력 표시
- 관리자 플랜 수동 변경 기능

---

## v0.2.0 — 2026-06-01

### 결과물 보관함 (`/my-results`)

- 모든 AI 생성물 저장·검색·필터·다운로드
- 개인 ZIP 백업 다운로드

### 관리자 대시보드 확장

- 사용자 관리, AI 통계, 에러 로그, 공지 관리
- 버전 관리 (`/admin/app-versions`)

### 기술 개선

- AI 응답 캐싱 (`ai_cache` 테이블)
- 중복 요청 방지 (`ai_locks` 테이블)
- AI Provider 추상화 (Anthropic / OpenAI / Gemini / Mock)

---

## v0.1.0 MVP — 2026-05-01

### 핵심 기능

- 이메일 회원가입·로그인·비밀번호 재설정
- AI 문자/카톡 생성 (`/ai-message`)
- AI 상담 스크립트 생성 (`/ai-script`)
- AI PDF 분석 (`/ai-document`)
- 요금제 구조 (무료/기본/프로/프리미엄)
- 월 사용량 추적 및 한도 검사
- 관리자 기본 기능 (사용자·통계·공지)
- Supabase Auth + RLS 보안 구조
- Vercel Cron 원본 PDF 자동 삭제
