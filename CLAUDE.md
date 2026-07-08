# FP AI Assistant — Claude 작업 컨텍스트

> 이 파일은 세션이 바뀌어도 Claude가 프로젝트 맥락을 유지하기 위한 파일입니다.
> 새 기능을 추가하거나 중요한 결정이 생기면 이 파일을 업데이트해주세요.

---

## 프로젝트 개요

- **서비스명**: FP AI Assistant (보험설계사 전용 AI 도구)
- **스택**: Next.js 14 App Router (TypeScript), Supabase Auth + DB, Vercel 배포
- **AI 모델**: Anthropic Claude
  - 기본(대부분 기능): `claude-haiku-4-5-20251001`
  - 고품질(스크립트+성향분석 포함, SMS 5번째 초안): `claude-sonnet-5`
- **결제**: 포트원(PortOne) + 한국결제네트웍스(KPN) — 일반결제/정기결제(빌링키) 코드 구현 완료, PG 계약 심사 중
- **배포 브랜치**: `main` → Vercel 자동 배포

---

## 요금제 (현재 확정)

| 플랜 | 월정액 | 연간 |
|------|--------|------|
| 무료 | ₩0 | ₩0 |
| 기본 (Basic) | ₩5,900 | ₩59,000 |
| 프로 (Pro) | ₩9,900 | ₩99,000 |
| 프리미엄 (Premium) | ₩16,900 | ₩169,000 |

### 플랜별 기능 한도

| 기능 | 무료 | 기본 | 프로 | 프리미엄 |
|------|------|------|------|---------|
| AI 문자/카톡 | 3 | 15 | 50 | 100 |
| AI 스크립트 통합풀 | 0 | 10 | 20 | 45 |
| AI PDF 분석 (업로드+생성 통합 한도) | 3 | 10 | 30 | 50 |
| SNS·블로그 콘텐츠 | 0 | 0 | 10 | 20 |
| 뉴스레터 | 0 | 0 | 0 | 10 |

> **AI 스크립트 통합풀**은 AI 상담 스크립트·고객 성향분석·거절극복 스크립트·재무설계 간이 리포트·
> AI 상담 후기 작성 5개 기능이 하나의 카운터를 공유함 (`lib/subscription/usage.ts`의 `'script'` feature)
>
> AI 후속연락 추천 기능은 제거됨 — 여유 한도는 AI PDF 분석에 합산함
>
> **AI PDF 분석**은 `pdfUploadLimit`(업로드)과 `pdfAnalysisLimit`(설명자료 생성)이 항상 동일한
> 값으로 설정됨 — PDF 업로드는 로컬 텍스트 추출만 하므로 AI 토큰 비용이 없고(비용은 오직
> "설명자료 생성" 단계에서만 발생), 두 한도를 분리해두면 실제 처리 가능한 PDF 개수가 왜곡되므로
> 항상 같은 숫자로 유지할 것. 추출된 텍스트는 사용자에게 노출하지 않음(미리보기/다운로드 없음) —
> `document_generator`가 업로드된 파일을 선택하면 서버에서 저장된 추출 텍스트를 그대로 프롬프트에 사용.

---

## 수익률 계산 기준 (항상 이 기준으로 계산)

- **환율**: ₩1,550 / USD (고정)
- **서버비**: ₩70,000 / 월 (Vercel + Supabase)
- **결제 수수료**: 3.6% (Toss페이먼츠 신용·체크카드 실제 수수료율, 부가세 별도)
- **AI 모델 비용** (Sonnet 5 할인 중 ~2026-08-31):
  - Sonnet 5: Input $2/1M → ₩3,100/1M / Output $10/1M → ₩15,500/1M
  - Haiku 4.5: Input $0.80/1M → ₩1,240/1M / Output $4/1M → ₩6,200/1M
- **사용 시나리오**: 100% / 70% / 50% 3가지 모두 항상 표시

---

## 초과 크레딧 (추가 건수 구매) 시스템

유료 플랜 전용, 한도 소진 후 추가 구매 가능. 30일 유효.

| 팩 | 금액 | 건당 단가 | 할인 | 배지 |
|----|------|-----------|------|------|
| 10건 | ₩2,000 | ₩200 | 기준 | - |
| 20건 | ₩3,800 | ₩190 | -5% | - |
| 30건 | ₩5,400 | ₩180 | -10% | POPULAR |
| 40건 | ₩6,800 | ₩170 | -15% | - |
| 50건 | ₩8,000 | ₩160 | -20% | BEST |

- DB 테이블: `user_extra_credits`
- 팩 정의 파일: `lib/billing/credit-packs.ts`
- 크레딧 로직: `lib/subscription/usage.ts` (getExtraCredits / consumeExtraCredit / addExtraCredits)
- 구매 API: `app/api/billing/credits/purchase/route.ts`
- 구매 모달: `components/billing/credits-purchase-modal.tsx`

---

## 포트원(PortOne) 결제 연동 현황

`lib/billing/portone-provider.ts` 에 상세 주석 있음. PG는 한국결제네트웍스(KPN)로 신청,
가입비/연회비 무료 + 빌링·수기 수수료 2.90%(부가세 별도, 계약 확정 전 잠정치).

- [x] 일반결제(요금제/크레딧 1회 결제) — `PortOne.requestPayment()`, 리다이렉트 없이 응답 즉시 확인
- [x] 빌링키 발급/자동청구/삭제 — `verifyBillingKey`/`chargeBillingKey`/`deleteBillingKey`
- [x] profiles 컬럼: `portone_billing_key`, `portone_customer_id`, `billing_card_last4`, `billing_card_brand`
- [x] 구독 만료 크론에서 빌링키 자동 갱신 시도 (`app/api/cron/subscription-check/route.ts`)
- [ ] **PG 계약 승인 후 남은 작업**: Vercel에 `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`,
      `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_WEBHOOK_SECRET` 실제 값 설정 → 실결제 테스트
- [ ] 확정된 최종 수수료율을 이 문서 "수익률 계산 기준" 절의 3.6%와 대조해 필요 시 갱신

---

## 주요 구현 완료 기능 목록

### AI 기능
- [x] AI 문자/카톡 생성 (Haiku, 5가지 스타일)
- [x] AI 상담 스크립트 생성 (성향분석 포함 시 Sonnet 5, 미포함 시 Haiku)
- [x] 고객 성향 분석 (Sonnet 5, 프로 이상)
- [x] 거절 극복 스크립트 (Haiku)
- [x] AI PDF 분석 (Haiku)
- [x] 블로그·SNS 콘텐츠 생성 (Haiku, 프로 이상)
- [x] 뉴스레터 생성 (Haiku, 프리미엄)
- [x] AI 상담 후기 작성 (Haiku)
- [x] 재무설계 간이 리포트 (Haiku)
- [x] 생애주기 알림 (구현 중)

### 결제/구독
- [x] 요금제 페이지 (기본/프로/프리미엄)
- [x] 포트원(PortOne) 일반결제/빌링키 연동 구조 (PG 계약 승인 전)
- [x] 초과 크레딧 5개 팩 구매 플로우
- [x] 70%/90% 사용량 경고 배너
- [x] 한도 초과 배너 + 크레딧 구매 버튼

### UX
- [x] 음성 입력 (AI 문자, 스크립트, 성향분석, 거절극복, 블로그 핵심메시지)
- [x] 내 결과물 보관함 저장 (스크립트, 거절극복, 콘텐츠 등)
- [x] 대시보드 사용량 카드 (플랜별 기능 자동 표시)
- [x] 플랜 잠금 (PlanGate 컴포넌트)

### 인프라
- [x] Supabase DB 마이그레이션 (usage_records, user_extra_credits 등)
- [x] 어드민 페이지 (사용자 관리, 빌링, CSV 내보내기)
- [x] 팀 관리 기능
- [x] 백업 로그 시스템

---

## 앞으로 할 것 (우선순위 순)

1. **생애주기 알림 UI 완성** (Task #24 in_progress)
2. **포트원 PG 계약 승인 후 실계정 연동** — 환경변수 설정 및 실결제 테스트
3. **뉴스레터 생성 기능 고도화** (현재 기본 구현)
4. **고객 DB 연동** — 고객 정보 저장/불러오기로 스크립트 자동완성
5. **모바일 UX 개선** — 음성 입력, 결과 공유 등

---

## 개발 규칙 / 중요 결정사항

- 수익률 표 요청 시: **항상** 서버비 + 결제수수료 + 환율 ₩1,550 포함, 100%/70%/50% 시나리오 모두 표시
- AI 모델: Sonnet 5 (고품질 필요 기능), Haiku (나머지) — 임의로 바꾸지 말 것
- 크레딧 구매: 유료 플랜(basic/pro/premium)만 가능 — free 차단 필수
- 배포: `main` 브랜치 push → Vercel 자동 배포
- 타입체크: 커밋 전 `npx tsc --noEmit` 항상 실행
