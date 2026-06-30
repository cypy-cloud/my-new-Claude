# 보안 점검 체크리스트 (Security Checklist)

최종 점검일: 2026-06-30
기술 스택: Next.js + TypeScript + Tailwind CSS + Supabase

이 문서는 FP AI Assistant의 15개 필수 보안 항목에 대한 점검 결과입니다. 각 항목은
코드베이스 실사를 통해 확인했으며, 근거가 되는 파일 위치를 함께 기록합니다.

---

## 1. 로그인 사용자만 기능 접근
**상태: ✅ 구현됨**

- 대시보드 레이아웃에서 미로그인 시 `/login`으로 강제 리다이렉트
  - `app/(dashboard)/layout.tsx`
- 모든 사용자용 API 라우트가 진입 시 `supabase.auth.getUser()`로 세션을 확인하고,
  없으면 401 반환
  - `app/api/files/route.ts`, `app/api/files/upload/route.ts`
  - `app/api/outputs/route.ts`, `app/api/outputs/backup/route.ts`
  - `app/api/ai/message/route.ts`, `app/api/ai/script/route.ts`, `app/api/ai/document/route.ts`

## 2. 본인 데이터만 조회 가능
**상태: ✅ 구현됨**

- 사용자 소유 테이블(uploaded_files, generated_outputs, usage_records 등)을 조회하는
  모든 쿼리가 서버에서 `.eq('user_id', user.id)` 필터를 명시적으로 적용
  - `app/api/files/route.ts` (목록 조회, 삭제)
  - `app/api/outputs/route.ts` (조회, 수정)
  - `app/api/outputs/backup/route.ts` (ZIP 백업)
  - `app/api/files/[id]/download/route.ts`
- RLS 정책이 2차 방어선으로 동일하게 적용되어 있어, 코드에 실수가 있어도 DB 레벨에서
  차단됨 (3번 항목 참고)

## 3. RLS 적용
**상태: ✅ 구현됨**

`supabase/migrations/`의 모든 사용자 데이터 테이블에 `enable row level security`가
적용되어 있고, 본인 데이터만 접근 가능한 정책이 함께 정의되어 있습니다.

적용 테이블: profiles, subscriptions, usage_logs, monthly_usage, usage_records,
ai_requests, ai_cache, event_logs, generated_outputs, uploaded_files,
subscription_events, admin_permissions, error_logs, announcement_reads,
user_onboarding, prompt_versions, backup_logs 등

> 참고: 이번 세션에서 `event_logs`, `generated_outputs`, `error_logs`, `usage_records`
> 마이그레이션이 운영 DB에 실제로 적용되지 않았던 것을 발견하고 적용 완료했습니다.
> **마이그레이션 파일이 저장소에 있다고 해서 DB에 반영된 것은 아니므로, 새 마이그레이션을
> 추가할 때마다 Supabase SQL Editor에서 직접 실행 여부를 반드시 확인해야 합니다.**

## 4. API 서버 측 user_id 검사
**상태: ✅ 구현됨**

- 모든 쓰기 작업(POST/PATCH/DELETE)에서 `user_id`는 클라이언트 요청 본문이 아니라
  서버에서 `supabase.auth.getUser()`로 얻은 세션 사용자 ID를 사용
  - `app/api/outputs/route.ts` (생성/수정 시 `user.id` 사용, body의 user_id 무시)
  - `app/api/files/upload/route.ts` (insert 시 `user_id: user.id`)
- 클라이언트가 임의로 다른 사용자의 user_id를 보내도 서버에서 무시되고 RLS로 한 번 더 차단됨

## 5. 관리자 권한 검사
**상태: ✅ 구현됨**

- 공통 가드 함수 `adminGuard(minRole)` — `lib/auth/middleware-guard.ts`
- `app/api/admin/**` 하위 모든 라우트가 진입 시 `adminGuard('admin')` 또는
  `adminGuard('super_admin')` 호출 (users, export, prompts, errors, feedback,
  cleanup-files, announcements, permissions, plan, stats)
- 가드 실패 시 401/403을 즉시 반환하고 이후 로직을 실행하지 않음

## 6. 파일 확장자 제한
**상태: ✅ 구현됨**

- 서버에서 MIME 타입을 검사하여 PDF가 아니면 거부
  - `app/api/files/upload/route.ts`: `if (file.type !== 'application/pdf') { ... 400 }`
- 클라이언트 입력 필드도 `accept=".pdf,application/pdf"`로 제한 (`components/ai/pdf-uploader.tsx`)
- 클라이언트 제한은 우회 가능하므로 서버 검증이 실질적 방어선

## 7. 파일 크기 제한
**상태: ✅ 구현됨**

- 서버에서 요금제별 최대 용량을 초과하면 거부
  - `app/api/files/upload/route.ts`: `getPlanLimits(planId).maxFileSizeMb`와 비교 후 초과 시 400
- 요금제별 한도는 `lib/subscription/plans.ts`에 정의

## 8. 개인정보 업로드 경고
**상태: ✅ 구현됨**

- PDF 업로드 화면에 개인정보(이름/주민등록번호/연락처/주소/증권번호) 업로드 금지 경고문 표시
  - `components/ai/pdf-uploader.tsx`
- "개인정보가 포함되지 않았음을 확인했습니다" 체크박스를 선택해야 업로드 가능
- 최초 로그인 온보딩 모달에도 동일 안내 포함 (`components/onboarding/onboarding-modal.tsx`)

## 9. 환경변수 노출 방지
**상태: ✅ 구현됨**

- `NEXT_PUBLIC_*` 접두사가 붙은 변수는 Supabase anon key, 앱 URL, Toss 클라이언트 키 등
  원래 공개되어도 무방한 값만 사용 (`next.config.ts` 확인, 별도 노출 설정 없음)
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` 등 민감한 키는
  서버 전용 파일(`lib/supabase/admin.ts`, `lib/ai/*-provider.ts`)에서만 참조되며
  `"use client"` 컴포넌트에서 import된 사례 없음 (grep으로 확인)

## 10. AI API 키 클라이언트 노출 금지
**상태: ✅ 구현됨**

- `lib/ai/anthropic-provider.ts`, `lib/ai/openai-provider.ts`는 `"use client"` 지시어가
  없는 서버 전용 모듈
- 클라이언트는 `/api/ai/message`, `/api/ai/script`, `/api/ai/document` API 라우트만
  호출하고, AI 프로바이더 키는 그 라우트 내부(서버)에서만 사용됨

## 11. 관리자 페이지 접근 제한
**상태: ✅ 구현됨**

- `app/(admin)/layout.tsx`에서 `requireAdmin()` 호출 — 관리자 권한이 아니면
  `/dashboard`로 리다이렉트 (`lib/auth/permissions.ts`)
- 모든 `/admin/*` 페이지가 이 레이아웃을 상속하므로 페이지 레벨에서 일괄 보호됨

## 12. 에러 메시지 내부 정보 노출 금지
**상태: ✅ 구현됨 (이번 점검에서 2건 수정)**

- 공통 에러 핸들러는 `process.env.NODE_ENV === 'development'`일 때만 상세 메시지(`detail`)를
  응답에 포함하고, 운영 환경에서는 `USER_FRIENDLY_MESSAGES`의 친절한 한국어 메시지만 노출
  - `lib/errors/api-error-handler.ts`, `lib/errors/logger.ts`
- **발견 및 수정**: `app/api/files/route.ts`와 `app/api/files/upload/route.ts`에서
  환경 구분 없이 `detail: error.message`를 항상 응답에 포함하던 코드를 발견하여,
  다른 라우트와 동일하게 `NODE_ENV === 'development'`일 때만 노출하도록 수정했습니다.
  또한 두 라우트의 `console.error(JSON.stringify(...))` 호출을 제거하고 `logError()`를
  통한 표준 에러 로깅으로 통일했습니다.

## 13. 백업 다운로드 권한 검사
**상태: ✅ 구현됨**

- 사용자 ZIP 백업(`app/api/outputs/backup/route.ts`): 로그인 필수, 모든 쿼리에
  `.eq('user_id', user.id)` 적용 — 본인 데이터만 ZIP에 포함됨
- 관리자 CSV 내보내기(`app/api/admin/export/route.ts`): `adminGuard('admin')` 통과해야
  접근 가능, 모든 내보내기 시도가 `backup_logs`에 기록되어 추적 가능

## 14. 원본 PDF 관리자 열람 제한
**상태: ✅ 구현됨**

- 관리자 CSV 내보내기는 `uploaded_files`의 메타데이터(파일명, 크기, 상태, 날짜 등)만
  포함하며, PDF 원문 텍스트(`extracted_text`)나 스토리지 파일 자체는 내보내지 않음
  - `app/api/admin/export/route.ts`
- 관리자 라우트 중 `storage.from('pdf-uploads').download()`를 호출하는 곳이 없음 — 원본
  PDF 바이너리를 다운로드하는 것은 파일 소유자 본인의 ZIP 백업 라우트뿐임

## 15. 로그에 개인정보 저장 최소화
**상태: ✅ 구현됨 (이번 점검에서 보완)**

- `error_logs`에는 `user_id`, `area`, `error_message`(최대 2000자), `stack_trace`(최대
  5000자), `metadata`만 저장 — 이메일, 전화번호, 업로드 파일 본문 등은 저장하지 않음
  - `lib/errors/logger.ts`
- 분석 이벤트(`event_logs`)도 `event_name`, `feature_type`, `device_type` 등
  비식별 정보만 기록 (`lib/analytics/track.ts`)
- **보완**: `logError()` 함수에 `metadata`에 개인정보를 절대 담지 말라는 경고 주석을
  추가했고, 원시 DB 에러 객체를 그대로 `console.error`로 출력하던 코드 2건을 제거했습니다
  (12번 항목과 동일한 수정).

---

## 추가 발견사항 (15개 필수 항목 외, 참고용)

- **결제 웹훅 서명 검증 미구현**: `app/api/billing/webhook/route.ts`의
  `verifyTossSignature()` / `verifyStripeSignature()`가 현재 `TODO` 상태의 placeholder로
  항상 `true`를 반환합니다. 즉, 서명 없이도 누구나 결제 완료 웹훅을 위조해서 보낼 수
  있는 상태입니다. 실제 결제 연동(Toss/Stripe 키 발급) 시점에 반드시 HMAC 서명 검증을
  구현해야 합니다. 이번 점검 범위(15개 필수 항목)에는 포함되지 않아 별도 작업으로
  분리합니다.

---

## 점검 결과 요약

| # | 항목 | 상태 |
|---|------|------|
| 1 | 로그인 사용자만 기능 접근 | ✅ |
| 2 | 본인 데이터만 조회 가능 | ✅ |
| 3 | RLS 적용 | ✅ |
| 4 | API 서버 측 user_id 검사 | ✅ |
| 5 | 관리자 권한 검사 | ✅ |
| 6 | 파일 확장자 제한 | ✅ |
| 7 | 파일 크기 제한 | ✅ |
| 8 | 개인정보 업로드 경고 | ✅ |
| 9 | 환경변수 노출 방지 | ✅ |
| 10 | AI API 키 클라이언트 노출 금지 | ✅ |
| 11 | 관리자 페이지 접근 제한 | ✅ |
| 12 | 에러 메시지 내부 정보 노출 금지 | ✅ (수정 반영) |
| 13 | 백업 다운로드 권한 검사 | ✅ |
| 14 | 원본 PDF 관리자 열람 제한 | ✅ |
| 15 | 로그에 개인정보 저장 최소화 | ✅ (수정 반영) |

15개 항목 모두 코드 레벨에서 충족하고 있음을 확인했습니다.
