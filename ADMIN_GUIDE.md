# ADMIN_GUIDE.md — 관리자 운영 가이드

---

## 1. 관리자 접근 방법

### 권한 설정

1. 일반 회원가입 후 Supabase → `profiles` 테이블에서 `role` 컬럼을 `admin`으로 변경
2. 로그인 후 사이드바 하단 **관리자 페이지** 메뉴 클릭
3. URL: `/admin/dashboard`

### 권한 등급

| 등급 | 접근 가능 기능 |
|---|---|
| `user` | 일반 서비스 기능만 |
| `manager` | 일부 관리 기능 |
| `admin` | 대부분의 관리 기능 |
| `super_admin` | 모든 기능 + 권한 관리 |

---

## 2. 관리자 대시보드 (`/admin/dashboard`)

### 주요 지표

- **가입자 수**: 전체·이번 달 신규 가입자
- **AI 사용량**: 기능별(문자·스크립트·PDF·콘텐츠·뉴스레터) 이번 달 총 사용 횟수
- **예상 AI 비용**: 이번 달 Anthropic API 예상 비용 (USD)
- **요금제 분포**: 무료·기본·프로·프리미엄 가입자 수
- **에러 발생 건수**: 최근 24시간 에러 로그 수

---

## 3. 회원 관리 (`/admin/users`)

### 기능

- 전체 사용자 목록 조회 (이메일·가입일·요금제·사용량)
- 사용자 검색 (이메일 기준)
- 특정 사용자 세부 정보 조회

### 요금제 수동 변경

1. 사용자 목록에서 해당 사용자 클릭
2. "플랜 변경" 버튼 → 변경할 플랜 선택
3. 또는 Supabase → `profiles` 테이블 → `plan_type` 직접 수정:
   - `free` / `basic` / `pro` / `premium`

### 권한 변경

Supabase → `profiles` 테이블 → `role` 컬럼 수정:
- `user` / `manager` / `admin` / `super_admin`

---

## 4. 공지사항 관리 (`/admin/announcements`)

### 공지 작성

1. "새 공지 작성" 버튼 클릭
2. 제목·내용·유형(공지/업데이트/점검) 입력
3. **게시** 버튼 → 즉시 모든 사용자에게 노출

### 공지 유형

| 유형 | 표시 방식 |
|---|---|
| `notice` | 일반 공지 (파란색) |
| `update` | 기능 업데이트 (초록색) |
| `maintenance` | 점검 안내 (노란색) |

### 상단 고정

`is_pinned = true` 설정 시 공지사항 목록 최상단 고정

---

## 5. 버전/변경사항 관리 (`/admin/app-versions`)

### 새 버전 등록

1. "버전 등록" 버튼 클릭
2. 버전명 (`v1.0.0` 형식), 출시일, 제목, 설명, 변경사항 목록 입력
3. "현재 버전으로 설정" 체크 → 사용자 대시보드에 업데이트 배너 표시

### 사용자에게 노출되는 방식

- 로그인 후 대시보드 상단에 배너 표시
- 배너 닫기 또는 "자세히 보기" 클릭 시 `app_version_reads`에 읽음 기록 → 배너 재노출 없음
- `/changelog` 페이지에서 전체 이력 조회 가능

---

## 6. 피드백 관리 (`/admin/feedback`)

- 사용자가 `/feedback` 페이지에서 제출한 피드백 목록 조회
- 처리 상태 변경: `pending` → `reviewed` → `resolved`
- 피드백 내용은 `feedback` 테이블에 저장

---

## 7. 에러 로그 확인 (`/admin/errors`)

### 언제 확인해야 하나

- AI 생성 기능 오류 신고가 들어올 때
- 정기적으로 주 1회 이상 확인 권장

### 주요 필드

| 필드 | 설명 |
|---|---|
| `area` | 오류 발생 영역 (ai / files / api 등) |
| `error_message` | 오류 메시지 (최대 2000자) |
| `stack_trace` | 스택 트레이스 (최대 5000자) |
| `created_at` | 발생 시각 |

### AI Provider 폴백 모니터링

AI Provider 호출 실패 시 `mock` 응답으로 폴백이 발생합니다. 에러 로그에서 `area = 'ai'` 건을 정기 확인하여 API 키 만료·한도 초과 여부를 파악하세요.

---

## 8. 파일 정리 (`/admin/file-cleanup`)

- 만료된 원본 PDF 현황 조회
- 수동으로 정리 실행 가능 (Cron 자동 실행 외 즉시 정리 필요 시)
- `GET /api/cron/cleanup-files` + `Authorization: Bearer {CRON_SECRET}` 헤더

---

## 9. AI 통계 (`/admin/stats`)

- 기능별 월별 AI 사용 횟수 및 토큰 소모량
- 예상 API 비용 (USD/KRW)
- 캐시 히트율 (캐시 활용으로 절약된 비용)
- 요금제별 AI 사용량 분포

---

## 10. 관리자 권한 관리 (`/admin/permissions`)

`super_admin`만 접근 가능합니다.

- 다른 관리자 계정 권한 변경
- 권한 변경 이력 조회
- 권한 취소

---

## 11. 주요 Supabase 직접 쿼리 (긴급 상황용)

```sql
-- 특정 사용자 플랜 확인
SELECT id, email, plan_type, role FROM profiles WHERE email = '이메일@example.com';

-- 특정 사용자 이번 달 사용량 확인
SELECT * FROM usage_records 
WHERE user_id = 'UUID' AND usage_month = to_char(now(), 'YYYY-MM');

-- 만료된 PDF 파일 목록
SELECT id, storage_path, expires_at FROM uploaded_files 
WHERE expires_at < now() AND storage_deleted = false;

-- 오늘 신규 가입자
SELECT COUNT(*) FROM profiles WHERE created_at >= current_date;
```
