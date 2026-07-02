# SECURITY.md — 보안 정책

---

## 1. 개인정보 주의사항

### 수집 최소화 원칙

- 서비스에 필요한 최소한의 정보만 수집합니다: 이메일, 이름(선택), 요금제 정보
- PDF 업로드 시 고객 개인정보(주민등록번호·연락처·주소 등)가 포함되지 않도록 사용자에게 경고 표시 (`components/ai/pdf-uploader.tsx`)
- "개인정보가 포함되지 않았음을 확인했습니다" 체크박스 필수 동의 후 업로드 가능

### 원본 PDF 자동 삭제

원본 PDF는 요금제별 보관 기간이 지나면 자동 삭제됩니다:

| 요금제 | 보관 기간 |
|---|---|
| 무료 | 7일 |
| 기본 | 30일 |
| 프로 | 180일 |
| 프리미엄 | 365일 |

삭제 로직: `lib/files/cleanup.ts` / Vercel Cron 매일 새벽 1시 실행

### 에러 로그 개인정보 최소화

- `error_logs` 테이블에는 `user_id`, `area`, `error_message`(최대 2000자), `stack_trace`(최대 5000자)만 저장
- 이메일, 전화번호, PDF 본문 등 개인정보는 에러 로그에 절대 포함하지 않음 (`lib/errors/logger.ts`)

---

## 2. Row Level Security (RLS)

모든 사용자 데이터 테이블에 RLS가 활성화되어 있습니다.

### 적용 원칙

- 사용자는 본인의 `user_id`와 일치하는 행만 조회·수정·삭제 가능
- 서버 API는 `user_id` 필터를 명시적으로 적용 (RLS는 2차 방어선)
- 관리자 기능은 `service_role` 클라이언트(`createAdminClient()`)를 사용해 RLS 우회

### RLS 적용 테이블 목록

```
profiles, subscriptions, usage_records, usage_logs, monthly_usage,
ai_requests, ai_cache, event_logs, generated_outputs, uploaded_files,
subscription_events, admin_permissions, error_logs, announcement_reads,
user_onboarding, prompt_versions, backup_logs, customers,
customer_interactions, tasks, team_accounts, team_members, plans
```

> 새 테이블 추가 시 반드시 `enable row level security` 및 정책 추가 필요

---

## 3. 관리자 권한

### 권한 등급

```
user < manager < admin < super_admin
```

### 구현 위치

- 페이지 레벨: `app/(admin)/layout.tsx` → `requireAdmin()` 호출
- API 레벨: `lib/auth/middleware-guard.ts` → `adminGuard(minRole)` 호출
- 관리자 페이지(`/admin/*`)는 모두 이 레이아웃을 상속하므로 일괄 보호됨

### 관리자 계정 관리

- `profiles.role` 컬럼을 직접 Supabase에서 변경
- `gocypy@gmail.com`은 코드에서 `super_admin` 강제 부여 (운영자 안전장치)
- 관리자 비밀번호는 각별히 안전하게 관리 (2FA 강력 권장)

---

## 4. 파일 보안

### 업로드 제한

- 서버에서 MIME 타입 검사: `application/pdf`만 허용 (`app/api/files/upload/route.ts`)
- 요금제별 파일 크기 제한: `getPlanLimits(planId).maxFileSizeMb` 초과 시 400 반환
- 클라이언트 `accept=".pdf,application/pdf"` 제한 (서버 검증이 실질 방어선)

### 스토리지 접근 제어

- Supabase Storage 버킷 `pdf-uploads`는 **Private** 설정
- 파일 다운로드는 서버 API를 통해서만 가능하며 소유자 확인 후 서명된 URL 발급
- 관리자 라우트에서 원본 PDF 바이너리를 다운로드하는 로직 없음

---

## 5. API 키 보안

### 서버 전용 키

아래 키는 절대 클라이언트 코드에 노출하지 않습니다:

| 키 | 사용 위치 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` (서버 전용) |
| `ANTHROPIC_API_KEY` | `lib/ai/anthropic-provider.ts` (서버 전용) |
| `OPENAI_API_KEY` | `lib/ai/openai-provider.ts` (서버 전용) |
| `CRON_SECRET` | `app/api/cron/cleanup-files/route.ts` (서버 전용) |
| `TOSS_PAYMENTS_SECRET_KEY` | `app/api/billing/` (서버 전용) |

### 공개 가능한 키 (`NEXT_PUBLIC_*`)

- `NEXT_PUBLIC_SUPABASE_URL`: 공개 가능
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 공개 가능 (RLS로 보호됨)
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`: 공개 가능
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`: 공개 가능 (결제 위젯 초기화용)

### .gitignore 확인

`.env.local`은 반드시 `.gitignore`에 포함되어야 합니다. 실수로 커밋한 경우:

```bash
git rm --cached .env.local
# 해당 키를 즉시 무효화하고 새 키 발급
```

---

## 6. HTTP 보안 헤더

`next.config.ts`에서 모든 응답에 아래 헤더를 추가합니다:

| 헤더 | 값 | 목적 |
|---|---|---|
| X-DNS-Prefetch-Control | on | DNS 프리페치 활성화 |
| X-Content-Type-Options | nosniff | MIME 스니핑 방지 |
| X-Frame-Options | SAMEORIGIN | 클릭재킹 방지 |
| X-XSS-Protection | 1; mode=block | XSS 필터 활성화 |
| Referrer-Policy | strict-origin-when-cross-origin | 리퍼러 제한 |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | 불필요한 권한 차단 |

---

## 7. 에러 메시지 보안

- 운영 환경에서는 내부 에러 메시지를 클라이언트에 노출하지 않음
- `NODE_ENV === 'development'`일 때만 `detail: error.message` 포함
- 운영 환경에서는 사용자 친화적 한국어 메시지만 반환 (`lib/errors/api-error-handler.ts`)

---

## 8. 결제 웹훅 보안 (예정)

현재 `app/api/billing/webhook/route.ts`의 서명 검증이 placeholder 상태입니다.
Toss Payments 실 연동 시 반드시 HMAC 서명 검증을 구현해야 합니다:

```typescript
// TODO: 결제 연동 시 구현 필요
function verifyTossSignature(payload: string, signature: string): boolean {
  // HMAC-SHA256 검증 로직
}
```

---

## 9. 보안 점검 이력

최신 보안 점검 결과는 [`security_checklist.md`](./security_checklist.md)를 참고하세요.
15개 필수 항목 모두 충족 확인 (최종 점검일: 2026-06-30)
