# BACKUP_POLICY.md — 백업 및 복구 정책

---

## 1. 사용자 개인 백업 (ZIP 다운로드)

### 기능 설명

로그인한 사용자가 `/my-results` → "내 데이터 백업" 버튼으로 본인 데이터를 ZIP으로 다운로드할 수 있습니다.

### 포함 내용

- 생성된 AI 결과물 전체 (문자·스크립트·PDF 분석·뉴스레터·콘텐츠)
- 원본 PDF에서 추출한 텍스트
- 만료되지 않은 원본 PDF 파일
- 업로드파일목록.csv
- 사용량기록.csv

### API 엔드포인트

```
GET /api/outputs/backup
Authorization: 로그인 세션 필수
```

### 주의사항

- 원본 PDF는 요금제별 보관 기간 내에서만 포함됨
- 다운로드 시도는 `backup_logs` 테이블에 기록됨 (`backup_type = 'user_zip'`)
- 대용량 백업은 서버 타임아웃이 발생할 수 있으므로 필요 시 분할 다운로드 구현 검토

---

## 2. 관리자 CSV 내보내기

### 기능 설명

관리자가 `/admin/export`에서 전체 사용자 데이터를 CSV로 내보낼 수 있습니다.

### 접근 조건

- `admin` 이상 권한 필요
- 모든 내보내기 시도가 `backup_logs` 테이블에 기록 (`backup_type = 'admin_csv'`)

### 내보내기 항목

- 사용자 목록 (이메일·가입일·요금제·사용량)
- 업로드 파일 메타데이터 (파일명·크기·상태·날짜)
- AI 요청 통계

> **주의**: 원본 PDF 바이너리 및 추출 텍스트는 CSV에 포함되지 않습니다.

---

## 3. Supabase DB 백업

### 자동 백업 (Pro 이상)

Supabase Pro 플랜은 매일 자동 백업(PITR, Point-in-Time Recovery)을 제공합니다.
- Dashboard → Database → Backups에서 활성화 여부 확인
- 최대 7일치 PITR 복원 가능

### 수동 백업 (전 플랜 가능)

```bash
# DB 연결 정보는 Supabase → Settings → Database → Connection string 확인
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --schema=public --no-owner --no-privileges \
  -f backup_$(date +%Y%m%d).sql
```

### 권장 백업 주기

- 운영 환경: 최소 1일 1회
- 주요 마이그레이션 적용 직전/직후: 별도 1회 추가

### 백업 파일 보관

- 암호화된 외부 스토리지에 보관 (Google Drive, AWS S3 등)
- Connection string에 비밀번호가 포함되므로 절대 git에 커밋 금지

---

## 4. Supabase Storage 백업

```bash
# Supabase CLI 필요
supabase storage cp --recursive supabase://pdf-uploads ./storage-backup/pdf-uploads
```

### 주의사항

- 원본 PDF는 요금제별 보관 기간 경과 후 자동 삭제됨
- 스토리지 백업은 보관 기간 내에 주기적으로 수행해야 함
- 추출 텍스트와 생성 결과물은 DB에 영구 저장되어 삭제 대상 아님

---

## 5. 사용자 데이터 삭제 요청 처리

사용자가 완전 삭제를 요청한 경우 관리자는 아래 순서로 처리합니다.

### 처리 순서

1. **본인 확인**: 이메일·가입정보로 요청자 신원 확인
2. **데이터 백업 (선택)**: 법적 보관 의무가 있는 경우 CSV로 별도 보관
3. **스토리지 삭제**: `uploaded_files.storage_path` 기준으로 Supabase Storage에서 파일 삭제
4. **DB 레코드 삭제**: 아래 순서로 삭제

```sql
-- 순서 중요: 외래키 참조 순서 준수
DELETE FROM uploaded_files WHERE user_id = '[USER_ID]';
DELETE FROM generated_outputs WHERE user_id = '[USER_ID]';
DELETE FROM usage_records WHERE user_id = '[USER_ID]';
DELETE FROM usage_logs WHERE user_id = '[USER_ID]';
DELETE FROM monthly_usage WHERE user_id = '[USER_ID]';
DELETE FROM ai_requests WHERE user_id = '[USER_ID]';
DELETE FROM ai_cache WHERE user_id = '[USER_ID]';
DELETE FROM event_logs WHERE user_id = '[USER_ID]';
DELETE FROM feedback WHERE user_id = '[USER_ID]';
DELETE FROM user_onboarding WHERE user_id = '[USER_ID]';
DELETE FROM subscriptions WHERE user_id = '[USER_ID]';
DELETE FROM team_members WHERE user_id = '[USER_ID]';
DELETE FROM customers WHERE user_id = '[USER_ID]';
DELETE FROM tasks WHERE user_id = '[USER_ID]';
-- error_logs, backup_logs는 user_id를 NULL로 두어도 무방 (ON DELETE SET NULL)
DELETE FROM profiles WHERE id = '[USER_ID]'; -- 가장 마지막
```

5. **Auth 사용자 삭제**: Supabase Dashboard → Authentication → Users → 계정 삭제
6. **완료 통지**: 사용자에게 삭제 완료 안내

---

## 6. 복구 절차

### DB 복구

```bash
# PITR 복구: Supabase Dashboard → Database → Backups → Restore

# pg_dump 백업으로 복구
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f backup_YYYYMMDD.sql

# 백업 이후 마이그레이션 재적용
# supabase/migrations/ 에서 백업 시점 이후 파일만 순서대로 실행
```

### Storage 복구

```bash
supabase storage cp --recursive ./storage-backup/pdf-uploads supabase://pdf-uploads
```

### 애플리케이션 복구

Vercel → Deployments → 정상 배포였던 버전 → Promote to Production

### 복구 우선순위

1. DB 복구 (핵심 데이터)
2. 애플리케이션 재배포 (즉시 서비스 재개)
3. Storage 복구 (원본 PDF, 추출 텍스트는 DB에 있으므로 핵심 기능 영향 없음)
