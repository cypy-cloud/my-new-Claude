# BILLING_GUIDE.md — 요금제 및 결제 가이드

---

## 1. 요금제 구조

### 플랜별 가격 및 한도

| 기능 | 무료 | 기본 | 프로 | 프리미엄 |
|---|---|---|---|---|
| **월 요금** | ₩0 | **₩2,900** | **₩6,900** | **₩14,900** |
| AI 문자/카톡 | 5회 | 20회 | 80회 | 200회 |
| AI 스크립트 | 3회 | 10회 | 30회 | 80회 |
| PDF 분석 | 1회 | 2회 | 8회 | 20회 |
| 블로그·SNS 콘텐츠 | - | 5회 | 20회 | 30회 |
| 뉴스레터 생성 | - | 2회 | 10회 | 15회 |
| 파일 크기 | 5MB | 10MB | 30MB | 50MB |
| 원본 보관 | 7일 | 30일 | 180일 | 365일 |
| 우선 처리 | - | - | - | ✅ |
| 팀 공유 | - | - | - | 향후 예정 |

### 코드 위치

```
lib/subscription/plans.ts    — PLANS 상수 (가격·한도 정의)
lib/subscription/usage.ts    — 사용량 집계·한도 검사·차감 로직
```

### 사용량 초기화

매월 1일 자정에 이번 달 사용량이 초기화됩니다 (`usage_records.usage_month` 기준).

---

## 2. 사용량 추적

### 추적 기능 및 DB 컬럼

| 기능 | DB 컬럼 | feature 코드 |
|---|---|---|
| AI 문자/카톡 | `sms_count` | `sms` |
| AI 스크립트 | `script_count` | `script` |
| 후속 연락 | `followup_count` | `followup` |
| PDF 업로드 | `pdf_upload_count` | `pdf_upload` |
| PDF 분석 | `pdf_analysis_count` | `pdf_analysis` |
| 콘텐츠 생성 | `content_count` | `content` |
| 뉴스레터 생성 | `newsletter_count` | `newsletter` |

### 한도 초과 시 동작

API에서 `blockIfLimitExceeded()` 호출 → 한도 초과 시 HTTP 429 반환:

```json
{
  "error": "이번 달 사용 한도(20회)를 초과했습니다. 플랜을 업그레이드해주세요.",
  "limitExceeded": true,
  "check": { "used": 20, "limit": 20, "remaining": 0 }
}
```

---

## 3. 결제 연동 예정 구조

> **현재 상태**: 결제 미연동. Toss Payments 연동 예정.

### 연동 계획 (Phase 2)

```
사용자 → 업그레이드 버튼 클릭
         → Toss Payments 결제 위젯 띄우기
         → 결제 완료
         → POST /api/billing/webhook (결제 성공 콜백)
              → profiles.plan_type 업데이트
              → subscriptions 테이블 구독 정보 저장
              → 사용자에게 업그레이드 완료 알림
```

### 준비된 코드

- `app/api/billing/webhook/route.ts` — 웹훅 수신 엔드포인트 (서명 검증 TODO)
- `app/api/billing/checkout/route.ts` — 결제 세션 생성 (TODO)
- `lib/subscription/plans.ts` — 플랜 정의 (이미 구현)
- `components/billing/upgrade-button.tsx` — 업그레이드 버튼 (UI만 구현)

### 필요한 환경변수

```bash
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...   # 클라이언트 측 위젯 초기화용
TOSS_PAYMENTS_SECRET_KEY=test_sk_...      # 서버 측 결제 승인용
```

---

## 4. 구독 상태 관리

### 관련 테이블

| 테이블 | 역할 |
|---|---|
| `profiles.plan_type` | 현재 활성 플랜 |
| `subscriptions` | 구독 이력 (시작일·종료일·상태) |
| `subscription_events` | 업그레이드·다운그레이드·취소 이벤트 로그 |

### 관리자가 수동으로 플랜 변경하는 방법

1. `/admin/dashboard` → 사용자 검색
2. 해당 사용자 → "플랜 변경" 버튼 클릭
3. 또는 Supabase → `profiles` 테이블 → `plan_type` 직접 수정

---

## 5. 환불 및 해지 정책 (Placeholder)

> **현재**: 결제 미연동 상태이므로 실제 환불 처리 불가. 결제 연동 후 아래 정책 구현 예정.

### 계획 중인 정책

| 상황 | 처리 방법 |
|---|---|
| 결제 후 7일 이내 미사용 | 전액 환불 |
| 서비스 장애로 인한 손해 | 장애 시간 비례 크레딧 또는 환불 |
| 단순 변심 (7일 이후) | 잔여 기간 환불 없이 이번 달 말까지 서비스 유지 |
| 다운그레이드 | 다음 달부터 적용 (현재 달은 기존 플랜 유지) |

### 수동 처리 방법 (현재)

고객 요청 시 관리자가 Supabase에서 직접:
1. `profiles.plan_type = 'free'` 로 변경
2. `subscriptions` 테이블 구독 종료 처리
3. 결제 환불은 PG사 관리자 페이지에서 직접 처리

---

## 6. 원가 및 수익 참고

> 상세 분석은 내부 수익 분석 문서를 참고하세요.

| 플랜 | 요금 | 100% 사용 시 원가 | 50% 사용 시 마진 |
|---|---|---|---|
| 기본 | ₩2,900 | ₩1,553 | 70% |
| 프로 | ₩6,900 | ₩5,594 | 57% |
| 프리미엄 | ₩14,900 | ₩11,377 | 60% |

- AI 모델: Claude Sonnet 4.6 (Input $3/MTok, Output $15/MTok)
- 환율 기준: ₩1,555.10/USD (2026-07-02)
- Toss 수수료: 결제금액 × 3.3% + ₩110
