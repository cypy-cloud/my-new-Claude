# INCIDENT_RESPONSE.md — 장애 대응 절차

---

## 1. 장애 등급 정의

| 등급 | 설명 | 대응 목표 시간 |
|---|---|---|
| **P1 (Critical)** | 전체 서비스 접속 불가, 로그인 불가 | 30분 이내 복구 |
| **P2 (High)** | 주요 기능(AI 생성) 동작 불가 | 2시간 이내 복구 |
| **P3 (Medium)** | 일부 기능 오류, 성능 저하 | 24시간 이내 복구 |
| **P4 (Low)** | 비핵심 기능 오류, UI 버그 | 다음 배포 시 수정 |

---

## 2. 장애 탐지 방법

### 자동 탐지

- **Vercel**: 배포 실패 시 이메일 알림
- **Supabase**: 프로젝트 대시보드 Status 확인
- **에러 로그**: `/admin/errors` 에서 급증 확인

### 수동 확인

- 서비스 접속 테스트: `https://[도메인]`
- Supabase 상태: [status.supabase.com](https://status.supabase.com)
- Vercel 상태: [vercel-status.com](https://vercel-status.com)

---

## 3. P1: 전체 서비스 접속 불가

### 확인 순서

```
1. Vercel 배포 상태 확인
   → vercel.com → Project → Deployments → 최근 배포 상태
   → 빨간불: 배포 실패 → 이전 버전으로 롤백

2. Supabase 상태 확인
   → status.supabase.com
   → Supabase 장애: 복구 대기 (운영자 통제 불가)

3. DNS/도메인 확인
   → nslookup [도메인]
   → DNS 전파 지연 여부 확인

4. 환경변수 확인
   → Vercel → Settings → Environment Variables
   → 필수 변수 누락 여부 확인
```

### 롤백 방법

```
Vercel → Project → Deployments
→ 정상 동작하던 이전 배포 선택
→ "..." 메뉴 → "Promote to Production"
```

---

## 4. P2: AI 생성 기능 동작 불가

### 원인별 대응

#### Anthropic API 오류

```bash
# 에러 로그에서 확인
# /admin/errors → area = 'ai' 필터

# 가능한 원인:
# 1. API 키 만료 또는 한도 초과
#    → platform.anthropic.com 에서 잔액·한도 확인
#    → 필요 시 Vercel 환경변수 ANTHROPIC_API_KEY 업데이트

# 2. Anthropic 서비스 장애
#    → status.anthropic.com 확인
#    → 복구 대기

# 3. AI_PROVIDER가 mock으로 설정된 경우
#    → Vercel 환경변수 AI_PROVIDER=anthropic 확인
```

#### 임시 대응

```
Vercel 환경변수에서:
AI_PROVIDER=mock  (실제 API 대신 가짜 응답 반환)
→ 사용자에게 "AI 서비스 일시 점검 중" 공지 발송
→ Anthropic 복구 후 AI_PROVIDER=anthropic 복원
```

---

## 5. P2: 로그인/회원가입 오류

### 확인 순서

```
1. Supabase Auth 상태 확인
   → Supabase Dashboard → Authentication → 로그인 시도 로그

2. NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 확인
   → Vercel 환경변수 오타 여부

3. 이메일 발송 문제 (이메일 인증 사용 시)
   → Supabase → Authentication → Email Templates
   → SMTP 설정 확인
```

---

## 6. P2: 결제 관련 오류 (결제 연동 후)

```
1. Toss Payments 상태 확인
   → toss.im/payments/status

2. 웹훅 미수신 확인
   → Vercel Functions 로그에서 /api/billing/webhook 확인
   → Toss 관리자 페이지에서 웹훅 재전송

3. 결제 성공했으나 플랜 미변경
   → Supabase에서 수동으로 profiles.plan_type 변경
   → 고객에게 사과 + 보상 조치
```

---

## 7. P3: 파일 업로드/다운로드 오류

```
1. Supabase Storage 상태 확인
2. pdf-uploads 버킷 존재 여부 확인
3. 버킷 권한(Private) 설정 확인
4. 파일 크기 한도 초과 여부 확인 (요금제별 제한)
```

---

## 8. DB 장애 복구

### Supabase Pro (PITR 복구)

```
Supabase Dashboard
→ Database → Backups
→ Restore to point in time
→ 장애 발생 직전 시점 선택
```

### pg_dump 백업으로 복구

```bash
# 최근 백업 파일로 복구
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f backup_YYYYMMDD.sql

# 백업 이후 마이그레이션 재적용
# supabase/migrations/ 에서 해당 날짜 이후 파일 순서대로 실행
```

---

## 9. 사후 처리

### 장애 보고서 작성 (P1, P2)

```markdown
## 장애 보고서

- 발생 시각:
- 복구 시각:
- 영향 범위: (영향받은 사용자 수, 기능)
- 원인:
- 조치 내용:
- 재발 방지 대책:
```

### 사용자 공지

- `/admin/announcements` → 새 공지 작성
- 유형: `maintenance`
- 내용: 장애 발생 시각, 영향 범위, 복구 완료 안내, 사과 메시지

### 에러 로그 분석

```
/admin/errors 에서 장애 시간대 에러 집중 분석
→ 근본 원인 파악
→ 코드 수정 또는 인프라 변경으로 재발 방지
```

---

## 10. 연락처 및 지원

| 서비스 | 지원 경로 |
|---|---|
| Anthropic API | [console.anthropic.com](https://console.anthropic.com) → Support |
| Supabase | [supabase.com/dashboard](https://supabase.com/dashboard) → Help |
| Vercel | [vercel.com/support](https://vercel.com/support) |
| Toss Payments | [developers.tosspayments.com](https://developers.tosspayments.com) |

---

## 11. 정기 점검 체크리스트 (월 1회)

```
□ /admin/errors 에러 로그 검토
□ Anthropic API 잔액·한도 확인
□ Supabase 스토리지 사용량 확인
□ DB 수동 백업 실행
□ 만료 PDF 자동 삭제 Cron 정상 동작 확인 (/admin/file-cleanup)
□ AI Provider 폴백 발생 여부 확인
□ 비밀번호/API 키 교체 주기 확인 (90일 권장)
```
