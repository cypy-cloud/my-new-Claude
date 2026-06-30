# my-new-Claude

## 백업 및 복구 정책

### 1. Supabase DB 백업 방법

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

### 2. 스토리지(Storage) 백업 방법

- 원본 PDF는 Supabase Storage 버킷 `pdf-uploads`에 저장됩니다.
- **수동 백업**: Supabase CLI로 버킷 전체를 동기화합니다.
  ```bash
  supabase storage cp --recursive supabase://pdf-uploads ./storage-backup/pdf-uploads
  ```
- **사용자 단위 백업(이미 구현됨)**: 사용자가 직접 `GET /api/outputs/backup`을 호출하면 본인의 생성 결과물, 추출 텍스트, (만료되지 않은) 원본 PDF, 업로드파일목록.csv, 사용량기록.csv를 묶은 ZIP을 다운로드할 수 있습니다. 이 다운로드 기록은 `backup_logs` 테이블(`backup_type = 'user_zip'`)에 남습니다.
- **주의**: 원본 PDF는 요금제별 보관 기간(무료 7일/기본 30일/프로 180일/프리미엄 365일)이 지나면 자동 삭제되므로(`lib/files/cleanup.ts`), 스토리지 백업은 보관 기간 내에 주기적으로 수행해야 합니다. 추출된 텍스트와 생성 결과물은 DB에 남아있어 삭제 대상이 아닙니다.

### 3. 사용자 요청 시 데이터 삭제 방법 (탈퇴/삭제 요청 처리)

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

### 4. 장애 발생 시 복구 순서

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

## 버전 관리 및 변경사항 관리

서비스 업데이트 내역은 `app_versions` 테이블(마이그레이션 `018_app_versions.sql`)로 관리하며, 관리자가 등록한 버전을 사용자가 앱 내에서 바로 확인할 수 있습니다.

### 1. 버전 등록 방법 (관리자)

1. `/admin/app-versions`에 접속합니다 (admin 이상 권한 필요).
2. "버전 등록" 버튼을 눌러 다음 정보를 입력합니다.
   - **버전**: `v0.2.0`처럼 시맨틱 버전 형식 권장 (테이블의 `version` 컬럼, 고유값)
   - **출시일**: `release_date`
   - **제목 / 설명**: 사용자에게 보여줄 요약 정보 (`title`, `description`)
   - **변경사항**: 항목을 하나씩 추가하는 목록 입력 → `changes` jsonb 배열(`string[]`)로 저장
   - **현재 버전으로 설정**: 체크하면 `is_current = true`로 저장되고, 기존에 `is_current`였던 다른 버전은 자동으로 해제됩니다 (한 시점에 하나의 버전만 "현재 버전"이 되도록 API에서 보장).
3. 저장하면 즉시 모든 사용자에게 노출됩니다. (별도 게시/배포 절차 없음)

### 2. 사용자에게 업데이트 공지가 표시되는 방식

- 로그인 후 대시보드 상단에, 아직 읽지 않은 "현재 버전" 안내 배너(`components/changelog/version-banner.tsx`)가 표시됩니다.
- 배너의 "자세히 보기"를 클릭하거나 닫기(X) 버튼을 누르면 `app_version_reads` 테이블에 읽음 기록이 남고, 이후에는 같은 버전에 대해 배너가 다시 뜨지 않습니다.
- 사이드바의 "변경사항" 메뉴(`/changelog`)에서 전체 버전 이력을 언제든 다시 확인할 수 있습니다.

### 3. 변경사항 페이지 / 현재 버전 표시

- `/changelog` 페이지에서 등록된 모든 버전을 최신순으로 확인할 수 있으며, 각 항목을 클릭하면 설명과 변경사항 목록이 펼쳐집니다.
- 페이지 상단 제목 옆에 현재 서비스에 적용된 버전(`is_current = true`)이 배지로 표시됩니다.

### 4. 데이터 모델 요약

| 테이블 | 설명 |
|---|---|
| `app_versions` | 버전 정보(`id`, `version`, `title`, `description`, `changes`, `release_date`, `is_current`, `created_at`) |
| `app_version_reads` | 사용자별 버전 읽음 기록(`version_id`, `user_id`, `read_at`) — 배너 노출/숨김에 사용 |

저장소 루트의 `CHANGELOG.md`에는 사람이 읽기 위한 버전별 변경 이력을 텍스트로도 함께 기록합니다. 새 버전을 `app_versions`에 등록할 때마다 `CHANGELOG.md`에도 같은 내용을 추가하는 것을 권장합니다.

