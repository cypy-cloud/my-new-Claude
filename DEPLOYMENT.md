# DEPLOYMENT.md — 배포 가이드

---

## 1. 배포 전 체크리스트

```
□ npm run build 로컬 빌드 에러 없음 확인
□ Supabase 마이그레이션 001~041 모두 실행 완료
□ Vercel 환경변수 전체 등록 완료
□ CRON_SECRET 값 설정 완료
□ Supabase Storage pdf-uploads 버킷 생성 완료
□ .env.local 파일이 .gitignore에 포함되어 있음 확인
□ AI_PROVIDER=anthropic 로 설정 (mock 아닌지 확인)
```

---

## 2. Supabase 설정

### 프로젝트 생성

1. [supabase.com](https://supabase.com) → New Project
2. 프로젝트명·DB 비밀번호·리전(Northeast Asia 권장) 입력 후 생성
3. Project Settings → API 에서 아래 3개 값 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 마이그레이션 실행

SQL Editor → New Query → 아래 파일을 **번호 순서대로** 실행:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_usage_records.sql
...
supabase/migrations/041_content_newsletter_usage.sql
```

> **주의**: 파일이 저장소에 있다고 DB에 자동 반영되지 않습니다. 반드시 SQL Editor에서 직접 실행해야 합니다.

### Storage 버킷 생성

Storage → New Bucket → 이름: `pdf-uploads` → Private 체크 → Create

### Authentication 설정

Authentication → Providers → Email: Enable 확인 (기본 활성화)

---

## 3. Vercel 배포

### 최초 배포

1. [vercel.com](https://vercel.com) → New Project → GitHub 저장소 연결
2. Framework Preset: **Next.js** (자동 감지됨)
3. Environment Variables에 아래 표의 모든 값 입력
4. Deploy 클릭

### 환경변수 전체 목록

| 변수명 | 예시 값 | 필수 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | ✅ 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | ✅ 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ✅ 필수 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | ✅ 필수 |
| `AI_PROVIDER` | `anthropic` | ✅ 필수 |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | ✅ 필수 |
| `NEXT_PUBLIC_APP_NAME` | `FP AI Assistant` | ✅ 필수 |
| `CRON_SECRET` | 랜덤 32자 문자열 | ✅ 필수 |
| `AI_PROVIDER_SMS` | `anthropic` | 선택 (미설정 시 AI_PROVIDER 사용) |
| `AI_PROVIDER_SCRIPT` | `anthropic` | 선택 |
| `AI_PROVIDER_DOCUMENT` | `anthropic` | 선택 |
| `OPENAI_API_KEY` | `sk-...` | OpenAI 사용 시 |
| `GEMINI_API_KEY` | `AIza...` | Gemini 사용 시 |
| `TOSS_PAYMENTS_CLIENT_KEY` | `test_ck_...` | 결제 연동 시 |
| `TOSS_PAYMENTS_SECRET_KEY` | `test_sk_...` | 결제 연동 시 |

> `CRON_SECRET` 생성: `openssl rand -hex 32` 또는 [randomkeygen.com](https://randomkeygen.com)

### 자동 배포

`main` 브랜치(또는 연결된 배포 브랜치)에 `git push` 하면 Vercel이 자동으로 빌드·배포합니다.

---

## 4. Vercel Cron 설정

`vercel.json`에 정의된 Cron이 자동 등록됩니다:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-files",
      "schedule": "0 1 * * *"
    }
  ]
}
```

- 매일 새벽 1시에 만료된 원본 PDF를 자동 삭제합니다
- `CRON_SECRET`이 설정되어 있어야 동작합니다 (미설정 시 503 반환)

---

## 5. 관리자 계정 설정

1. 앱에서 일반 회원가입 진행
2. Supabase → Table Editor → `profiles` 테이블
3. 해당 계정 행에서 `role` 컬럼 값을 `admin` 또는 `super_admin`으로 변경
4. 로그인 후 사이드바 하단 "관리자 페이지" 메뉴 확인

> `gocypy@gmail.com` 계정은 코드에서 `super_admin` 권한이 강제 부여됩니다 (`app/(dashboard)/layout.tsx`).

---

## 6. 커스텀 도메인 연결 (선택)

1. Vercel → Project → Settings → Domains
2. 도메인 입력 → Add
3. DNS 공급자에서 CNAME 또는 A 레코드 설정
4. `NEXT_PUBLIC_APP_URL` 환경변수를 새 도메인으로 업데이트 후 재배포

---

## 7. 롤백 방법

Vercel → Project → Deployments → 롤백할 이전 배포 선택 → `...` 메뉴 → Promote to Production
