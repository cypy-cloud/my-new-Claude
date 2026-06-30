# FP AI Assistant

보험설계사(FP)를 위한 AI 업무 지원 SaaS입니다. 고객 문자/카톡 메시지 생성, 상담 스크립트 생성, 고객 PDF 자료 분석을 AI로 자동화하여 설계사의 반복 업무 시간을 줄여줍니다.

## 주요 기능

- **AI 문자/카톡 생성**: 상황별(가입 안내, 생일 축하, 보험금 청구 안내 등) 고객 메시지를 AI가 자동 생성
- **AI 상담 스크립트 생성**: 상담 목적에 맞는 10단계 스크립트를 AI가 자동 생성
- **AI PDF 분석**: 고객이 보낸 보험 증권/약관 PDF를 업로드하면 텍스트를 추출하고 쉬운 설명자료를 AI가 생성
- **결과물 보관함**: 생성된 모든 결과물을 저장하고 다운로드/검색 가능
- **요금제 및 사용량 관리**: 무료/기본/프로/프리미엄 플랜별 월 사용량 제한
- **개인 백업 ZIP**: 사용자가 본인 결과물·추출 텍스트·원본 PDF를 ZIP으로 직접 다운로드
- **관리자 대시보드**: 가입자 통계, AI 사용/비용 통계, 사용자·권한·공지·피드백·에러 로그 관리
- **공지사항 / 변경사항(Changelog) / 온보딩 튜토리얼 / 피드백** 등 사용자 지원 기능
- **AI 응답 캐싱 및 중복 요청 방지**로 API 비용 절감

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **언어**: TypeScript
- **스타일**: Tailwind CSS, Radix UI 기반 컴포넌트
- **백엔드/DB**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **AI Provider**: Anthropic / OpenAI / Gemini (Provider 추상화, Mock 모드 지원)
- **기타**: pdf-parse(PDF 텍스트 추출), JSZip(백업 압축), sonner(토스트 알림)

## 설치 방법

```bash
git clone <repository-url>
cd my-new-Claude
npm install
```

Node.js 20 이상을 권장합니다.

## 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 필수 여부 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 | Supabase anon(public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | 필수 | Supabase service role key (서버 전용, 절대 클라이언트에 노출 금지) |
| `AI_PROVIDER` | 필수 | 기본 AI Provider: `mock`\|`anthropic`\|`openai`\|`gemini` |
| `AI_PROVIDER_SMS`/`AI_PROVIDER_SCRIPT`/`AI_PROVIDER_DOCUMENT` | 선택 | 기능별 Provider 개별 지정 (미설정 시 `AI_PROVIDER` 사용) |
| `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GEMINI_API_KEY` | 사용하는 Provider에 한해 필수 | 각 AI Provider API 키 |
| `NEXT_PUBLIC_APP_URL` | 필수 | 서비스 기본 URL |
| `NEXT_PUBLIC_APP_NAME` | 필수 | 서비스 표시 이름 |
| `CRON_SECRET` | 운영 환경 필수 | 원본 PDF 자동 삭제 크론 엔드포인트 인증값 |
| `TOSS_PAYMENTS_*` / `STRIPE_*` | Phase 2 | 결제 연동 예정 (현재 미사용) |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Phase 3 | 스토리지 버킷 커스터마이징 예정 (현재 미사용) |

필수 환경변수가 누락되면 `lib/env.ts`의 `requireEnv()`가 해당 변수명을 포함한 명확한 한국어 에러 메시지로 즉시 실패합니다(불명확한 SDK 내부 오류 대신).

## Supabase 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. Project Settings → API에서 `Project URL`, `anon public key`, `service_role key`를 확인해 `.env.local`에 입력합니다.
3. Authentication → Providers에서 Email 로그인을 활성화합니다(기본 활성화되어 있음).
4. Storage에서 `pdf-uploads` 버킷을 생성합니다(Private 권장).

## DB 테이블 생성 방법

`supabase/migrations/` 폴더에 `001`부터 `018`까지 순서가 매겨진 SQL 마이그레이션 파일이 있습니다. Supabase 대시보드 → SQL Editor에서 **파일명 순서대로** 하나씩 실행합니다.

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_usage_records.sql
...
supabase/migrations/018_app_versions.sql
```

Supabase CLI를 사용한다면 다음으로 한 번에 적용할 수도 있습니다.

```bash
supabase db push
```

> 새 마이그레이션이 추가될 때마다 이 폴더에 순번이 이어지는 `.sql` 파일로 커밋되므로, 운영 DB에는 항상 최신 번호까지 빠짐없이 적용되어 있어야 합니다.

## 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속. (`npm run dev:webpack`은 Turbopack 대신 Webpack으로 실행하는 대안입니다.)

## 배포 방법

1. Vercel에 프로젝트를 연결합니다.
2. Vercel 프로젝트 설정 → Environment Variables에 위 "환경변수 설정" 표의 모든 값을 등록합니다.
3. `main`(또는 배포 브랜치)에 푸시하면 자동 빌드/배포됩니다.
4. 저장소 루트의 `vercel.json`에 정의된 Cron(`/api/cron/cleanup-files`, 매일 1회)이 Vercel Cron으로 자동 등록되어 만료된 원본 PDF를 정리합니다. `CRON_SECRET` 환경변수를 반드시 설정해야 동작합니다(미설정 시 503으로 비활성화됨).
5. 배포 전 로컬에서 `npm run build`로 빌드 에러가 없는지 반드시 확인합니다.

## 관리자 계정 설정

1. 일반 회원가입으로 계정을 생성합니다.
2. Supabase 대시보드 → Table Editor → `profiles` 테이블에서 해당 계정의 `role` 컬럼을 `admin` 또는 `super_admin`으로 변경합니다.
3. 로그인 후 사이드바 하단에 "관리자 페이지" 메뉴가 나타납니다 (`/admin/dashboard`).
4. 권한 단계는 `user` < `manager` < `admin` < `super_admin` 순이며, 각 관리자 기능(`/admin/*`)은 필요한 최소 등급을 `adminGuard`/`requireAdmin`으로 검사합니다.

> 참고: `gocypy@gmail.com` 계정은 운영자 안전장치로 코드에서 `super_admin` 권한이 강제 부여되도록 되어 있습니다(`app/(dashboard)/layout.tsx`). 해당 계정의 비밀번호는 특히 안전하게 관리해야 합니다.

## AI Provider 설정

`AI_PROVIDER` 값으로 기본 Provider를 선택합니다.

- `mock`: API 키 없이 가짜 응답을 반환 (로컬 개발/테스트 기본값)
- `anthropic`: Claude 모델 사용, `ANTHROPIC_API_KEY` 필요
- `openai`: GPT 모델 사용, `OPENAI_API_KEY` 필요
- `gemini`: Gemini 모델 사용, `GEMINI_API_KEY` 필요

기능별(문자/스크립트/문서분석)로 다른 Provider를 쓰고 싶다면 `AI_PROVIDER_SMS`, `AI_PROVIDER_SCRIPT`, `AI_PROVIDER_DOCUMENT`를 개별 지정합니다. 실제 Provider 호출이 실패하면 자동으로 `mock` 응답으로 폴백합니다(`lib/ai/provider.ts`) — 운영 환경에서는 폴백 발생 여부를 `/admin/errors`에서 주기적으로 확인하는 것을 권장합니다.

AI 응답은 동일 입력(`SHA-256` 해시 기준)에 대해 `ai_cache` 테이블에 캐싱되어 동일 요청 시 API 비용 없이 즉시 응답합니다(`lib/ai/ai-cache.ts`).

## 결제 연동 예정 구조

현재 결제는 연동되어 있지 않으며, `.env.local.example`에 Phase 2용으로 `TOSS_PAYMENTS_*`(토스페이먼츠) 및 `STRIPE_*`(해외 결제) 환경변수가 주석 처리되어 준비되어 있습니다. 요금제 구조(`lib/subscription/plans.ts`)와 사용량 제한 로직(`lib/subscription/usage.ts`)은 이미 구현되어 있어, 결제 PG 연동 시 결제 성공 콜백에서 `profiles.plan_type`과 `subscriptions` 테이블만 갱신하면 되도록 설계되어 있습니다.

## 백업/복구

DB·스토리지 백업, 사용자 데이터 삭제 요청 처리, 장애 복구 절차는 별도 섹션으로 상세히 정리되어 있습니다 → [백업 및 복구 정책](#백업-및-복구-정책)

## 보안 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 등 비밀키는 절대 클라이언트 코드나 git에 커밋하지 않습니다. `.env.local`은 `.gitignore`에 포함되어 있습니다.
- 보안 점검 항목과 결과는 [`security_checklist.md`](./security_checklist.md)에 정리되어 있습니다(15개 항목, 코드 위치 기준 점검).
- 인증되지 않은 사용자의 보호된 페이지 접근은 각 라우트 그룹의 레이아웃(`app/(dashboard)/layout.tsx`, `app/(admin)/layout.tsx`)에서 차단합니다. 전역 `middleware.ts`는 존재하지 않으므로, 새 보호 라우트를 추가할 때는 반드시 해당 라우트가 보호되는 레이아웃 그룹 안에 위치하는지 확인해야 합니다.
- 에러 로그(`lib/errors/logger.ts`)는 메시지/스택을 일정 길이로 자르고 비공개 관리자 페이지(`/admin/errors`)에서만 조회 가능합니다.
- 원본 PDF는 요금제별 보관 기간 경과 후 자동 삭제됩니다 (`lib/files/cleanup.ts`, Vercel Cron으로 매일 실행).

## 버전 관리

서비스 업데이트 내역은 `app_versions` 테이블로 관리하며, 관리자가 `/admin/app-versions`에서 새 버전을 등록하면 사용자 대시보드 배너와 `/changelog` 페이지에 즉시 노출됩니다. 사람이 읽기 위한 변경 이력은 [`CHANGELOG.md`](./CHANGELOG.md)에도 함께 기록합니다. 자세한 등록/노출 방식은 [버전 관리 및 변경사항 관리](#버전-관리-및-변경사항-관리) 섹션을 참고하세요.

## 향후 개발 계획

- 결제(PG) 연동: 토스페이먼츠/스트라이프 실 연동 및 요금제 자동 전환
- 전역 `middleware.ts` 도입 검토: 레이아웃 단위 가드를 보완하는 엣지 레벨 인증 체크
- AI 생성 결과 저장과 사용량 차감의 원자적(트랜잭션) 처리: 현재는 클라이언트가 별도 호출로 결과를 저장하므로, 저장 실패 시에도 사용량은 이미 차감된 상태로 남을 수 있음
- AI Provider 장애 시 mock 폴백 발생을 관리자에게 능동적으로 알림(현재는 `/admin/errors`에서 사후 확인만 가능)
- 모바일 네이티브 앱(또는 PWA) 지원

---

# 백업 및 복구 정책

## 1. Supabase DB 백업 방법

- **자동 백업**: Supabase는 Pro 플랜 이상에서 매일 자동 백업(PITR, Point-in-Time Recovery)을 제공합니다. 프로젝트 설정의 Database → Backups에서 활성화 여부와 보관 기간을 확인합니다.
- **수동 백업(권장, 무료 플랜 포함 가능)**:
  1. Supabase 대시보드 → Project Settings → Database → Connection string 확인
  2. 로컬 또는 서버에서 `pg_dump` 실행:
     ```bash
     pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
       --schema=public --no-owner --no-privileges \
       -f backup_$(date +%Y%m%d).sql
     ```
  3. 생성된 `.sql` 파일은 별도의 안전한 저장소(암호화된 외부 스토리지, 사내 NAS 등)에 보관하고, 비밀번호 등 민감정보가 포함된 connection string은 절대 커밋하지 않습니다.
- **권장 주기**: 운영 환경 기준 최소 1일 1회, 주요 마이그레이션 적용 직전/직후에는 별도로 1회씩 추가 백업.
- **마이그레이션 파일**: `supabase/migrations/*.sql`은 이미 git에 보관되어 스키마 변경 이력 자체가 추적되므로, 데이터 백업과 별개로 항상 최신 상태를 유지합니다.

## 2. 스토리지(Storage) 백업 방법

- 원본 PDF는 Supabase Storage 버킷 `pdf-uploads`에 저장됩니다.
- **수동 백업**: Supabase CLI로 버킷 전체를 동기화합니다.
  ```bash
  supabase storage cp --recursive supabase://pdf-uploads ./storage-backup/pdf-uploads
  ```
- **사용자 단위 백업(이미 구현됨)**: 사용자가 직접 `GET /api/outputs/backup`을 호출하면 본인의 생성 결과물, 추출 텍스트, (만료되지 않은) 원본 PDF, 업로드파일목록.csv, 사용량기록.csv를 묶은 ZIP을 다운로드할 수 있습니다. 이 다운로드 기록은 `backup_logs` 테이블(`backup_type = 'user_zip'`)에 남습니다.
- **주의**: 원본 PDF는 요금제별 보관 기간(무료 7일/기본 30일/프로 180일/프리미엄 365일)이 지나면 자동 삭제되므로(`lib/files/cleanup.ts`), 스토리지 백업은 보관 기간 내에 주기적으로 수행해야 합니다. 추출된 텍스트와 생성 결과물은 DB에 남아있어 삭제 대상이 아닙니다.

## 3. 사용자 요청 시 데이터 삭제 방법 (탈퇴/삭제 요청 처리)

사용자가 본인 데이터의 완전 삭제를 요청한 경우, 관리자는 다음 순서로 처리합니다.

1. **본인 확인**: 요청자가 실제 계정 소유자인지 이메일/가입정보 등으로 확인합니다.
2. **사용자 데이터 백업(선택, 법적 보관 의무가 있는 경우)**: 삭제 전 `app/api/admin/export`를 이용해 해당 사용자 관련 레코드를 CSV로 보관하거나, Supabase Table Editor에서 `user_id` 기준으로 조회해 별도 보관합니다.
3. **스토리지 원본 삭제**: `uploaded_files.storage_path`가 있는 경우 Supabase Storage에서 해당 파일을 삭제합니다.
4. **DB 레코드 삭제 또는 익명화**: 아래 테이블에서 해당 `user_id` 행을 삭제합니다.
   - `uploaded_files`, `generated_outputs`, `usage_records`, `usage_logs`, `monthly_usage`, `ai_requests`, `ai_cache`, `event_logs`, `feedback`, `user_onboarding`, `subscriptions`, `team_members`
   - `profiles`는 가장 마지막에 삭제합니다(다른 테이블의 외래키 참조 때문).
   - `error_logs`, `backup_logs`는 `user_id`를 `null`로 두어도 무방합니다(이미 `on delete set null`로 설정됨).
5. **Supabase Auth 사용자 삭제**: Supabase 대시보드 → Authentication → Users에서 해당 계정을 삭제하거나, `supabase.auth.admin.deleteUser(userId)`를 호출합니다.
6. **처리 결과 통지**: 사용자에게 삭제 완료를 안내합니다.

## 4. 장애 발생 시 복구 순서

1. **장애 범위 파악**: 에러 로그(`/admin/errors`)와 Supabase 대시보드 상태 페이지를 확인해 DB/스토리지/애플리케이션 중 어느 영역의 장애인지 파악합니다.
2. **DB 장애**:
   - Supabase Pro 이상이면 PITR로 특정 시점으로 복구(Database → Backups → Restore).
   - 무료 플랜이거나 PITR 미사용 시, 가장 최근의 `pg_dump` 백업 파일로 복구:
     ```bash
     psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f backup_YYYYMMDD.sql
     ```
   - 이후 `supabase/migrations/`에 있는, 백업 시점 이후의 마이그레이션 파일들을 순서대로 다시 적용합니다.
3. **스토리지 장애**:
   - 별도로 백업해둔 `storage-backup/pdf-uploads` 디렉터리를 Supabase Storage 버킷에 재업로드합니다.
   - 원본이 복구되지 않더라도 `extracted_text`/`summary_text`/생성 결과물은 DB에 남아있으므로 서비스 핵심 기능은 즉시 정상 동작합니다.
4. **애플리케이션 장애**: 최근 정상 배포였던 git 커밋/태그로 롤백 후 재배포합니다.
5. **사후 점검**: 복구 완료 후 `/admin/file-cleanup`, `/admin/backup` 등 관리자 페이지에서 데이터 정합성을 확인하고, 장애 원인을 `error_logs`에 기록된 내용을 바탕으로 분석합니다.

# 버전 관리 및 변경사항 관리

서비스 업데이트 내역은 `app_versions` 테이블(마이그레이션 `018_app_versions.sql`)로 관리하며, 관리자가 등록한 버전을 사용자가 앱 내에서 바로 확인할 수 있습니다.

## 1. 버전 등록 방법 (관리자)

1. `/admin/app-versions`에 접속합니다 (admin 이상 권한 필요).
2. "버전 등록" 버튼을 눌러 다음 정보를 입력합니다.
   - **버전**: `v0.2.0`처럼 시맨틱 버전 형식 권장 (테이블의 `version` 컬럼, 고유값)
   - **출시일**: `release_date`
   - **제목 / 설명**: 사용자에게 보여줄 요약 정보 (`title`, `description`)
   - **변경사항**: 항목을 하나씩 추가하는 목록 입력 → `changes` jsonb 배열(`string[]`)로 저장
   - **현재 버전으로 설정**: 체크하면 `is_current = true`로 저장되고, 기존에 `is_current`였던 다른 버전은 자동으로 해제됩니다 (한 시점에 하나의 버전만 "현재 버전"이 되도록 API에서 보장).
3. 저장하면 즉시 모든 사용자에게 노출됩니다. (별도 게시/배포 절차 없음)

## 2. 사용자에게 업데이트 공지가 표시되는 방식

- 로그인 후 대시보드 상단에, 아직 읽지 않은 "현재 버전" 안내 배너(`components/changelog/version-banner.tsx`)가 표시됩니다.
- 배너의 "자세히 보기"를 클릭하거나 닫기(X) 버튼을 누르면 `app_version_reads` 테이블에 읽음 기록이 남고, 이후에는 같은 버전에 대해 배너가 다시 뜨지 않습니다.
- 사이드바의 "변경사항" 메뉴(`/changelog`)에서 전체 버전 이력을 언제든 다시 확인할 수 있습니다.

## 3. 변경사항 페이지 / 현재 버전 표시

- `/changelog` 페이지에서 등록된 모든 버전을 최신순으로 확인할 수 있으며, 각 항목을 클릭하면 설명과 변경사항 목록이 펼쳐집니다.
- 페이지 상단 제목 옆에 현재 서비스에 적용된 버전(`is_current = true`)이 배지로 표시됩니다.

## 4. 데이터 모델 요약

| 테이블 | 설명 |
|---|---|
| `app_versions` | 버전 정보(`id`, `version`, `title`, `description`, `changes`, `release_date`, `is_current`, `created_at`) |
| `app_version_reads` | 사용자별 버전 읽음 기록(`version_id`, `user_id`, `read_at`) — 배너 노출/숨김에 사용 |

저장소 루트의 `CHANGELOG.md`에는 사람이 읽기 위한 버전별 변경 이력을 텍스트로도 함께 기록합니다. 새 버전을 `app_versions`에 등록할 때마다 `CHANGELOG.md`에도 같은 내용을 추가하는 것을 권장합니다.
