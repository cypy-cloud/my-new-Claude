# FP AI Assistant

보험설계사(FP)를 위한 AI 업무 자동화 SaaS입니다. AI 문자/카톡 생성, 상담 스크립트, PDF 분석, 블로그·SNS 콘텐츠, 뉴스레터 생성, 업무 캘린더, 고객 관리까지 설계사의 반복 업무를 자동화합니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| AI 문자/카톡 생성 | 상황별(가입 안내·생일·청구 안내 등) 고객 메시지 자동 생성 |
| AI 상담 스크립트 | 상담 목적별 10단계 스크립트 자동 생성 |
| AI PDF 분석 | 보험 증권·약관 PDF 업로드 → 쉬운 설명자료 생성 |
| 블로그·SNS 콘텐츠 | 블로그 본문 + 인스타·페이스북·카카오채널·해시태그 일괄 생성 |
| 뉴스레터 생성 | 8섹션 월간 뉴스레터 초안 생성 + TXT 다운로드 |
| 업무 캘린더 | 고객 후속연락·미팅·갱신·생일 일정 관리 (오늘/주간/월간) + 푸시 알림 |
| 고객 관리 | 고객 정보 등록·조회·상호작용 이력 관리 |
| 팀 관리 | 팀 계정 생성·멤버 초대·역할 관리 |
| 결과물 보관함 | 모든 AI 생성물 저장·검색·다운로드 |
| 템플릿 라이브러리 | 보험사별·상황별 AI 프롬프트 템플릿 제공 |
| 관리자 대시보드 | 가입자·AI 사용량·비용 통계, 사용자·공지·피드백 관리 |

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS, Radix UI |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| AI | Anthropic Claude Haiku 4.5 (문자·후속) + Sonnet 4.6 (스크립트·PDF·콘텐츠), OpenAI / Gemini 지원 |
| 배포 | Vercel |
| 결제 | Toss Payments (연동 예정) |
| 푸시 알림 | Web Push API (VAPID) + PWA Service Worker |
| 기타 | pdf-parse, JSZip, sonner, lucide-react |

---

## 설치 방법

Node.js 20 이상이 필요합니다.

```bash
git clone <repository-url>
cd my-new-Claude
npm install
```

`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
# 에디터로 열어 필수 환경변수 입력
```

### 필수 환경변수

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (서버 전용) |
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `AI_PROVIDER` | `anthropic` \| `openai` \| `gemini` \| `mock` |
| `NEXT_PUBLIC_APP_URL` | 서비스 기본 URL |
| `NEXT_PUBLIC_APP_NAME` | 서비스 표시 이름 |
| `CRON_SECRET` | 원본 PDF 자동 삭제 크론 인증값 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID 공개 키 |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 비밀 키 (서버 전용) |
| `VAPID_EMAIL` | VAPID 등록 이메일 |

> 전체 환경변수 목록은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

---

## Supabase 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings → API에서 URL · anon key · service_role key 확인
3. Authentication → Email 로그인 활성화 (기본 활성화)
4. Storage → `pdf-uploads` 버킷 생성 (Private 권장)
5. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` ~ `042_push_notifications.sql` 순서대로 실행

```bash
# Supabase CLI 사용 시
supabase db push
```

---

## 로컬 실행

```bash
npm run dev
# http://localhost:3000 접속
```

프로덕션 빌드 확인:

```bash
npm run build
npm run start
```

---

## 관련 문서

| 문서 | 내용 |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel 배포, 환경변수, 배포 체크리스트 |
| [SECURITY.md](./SECURITY.md) | 보안 정책, RLS, API 키 관리 |
| [BACKUP_POLICY.md](./BACKUP_POLICY.md) | 백업·복구 절차 |
| [BILLING_GUIDE.md](./BILLING_GUIDE.md) | 요금제 구조, 결제 연동 계획 |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | 관리자 기능 사용법 |
| [USER_GUIDE.md](./USER_GUIDE.md) | 사용자 기능 가이드 |
| [ROADMAP.md](./ROADMAP.md) | 개발 로드맵 |
| [CHANGELOG.md](./CHANGELOG.md) | 버전별 변경 이력 |
| [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) | 장애 대응 절차 |
