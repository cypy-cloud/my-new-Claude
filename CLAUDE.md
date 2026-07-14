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
  (2026-07-13 KPN 카드사 심사 제출, 최장 2주 소요 예상). 승인 불발 대비 **NHN KCP를 백업 PG로 병행
  신청 진행 중** (가입비/연회비 무료 안내 받음) — 포트원이 NHN KCP를 이미 지원하므로 승인되면
  코드 수정 없이 관리자콘솔에서 채널만 추가하면 전환 가능
- **배포 브랜치**: `main` → Vercel 자동 배포

---

## 요금제 (현재 확정)

> **월정액 결제만 지원** — KPN(한국결제네트웍스) 내부 정책상 연간결제 서비스는 PG 입점이
> 불가하다는 안내를 받아, 연간결제/2개월 할인 관련 UI·로직을 전부 제거함 (2026-07-10).

| 플랜 | 월정액 |
|------|--------|
| 무료 | ₩0 |
| 기본 (Basic) | ₩5,900 |
| 프로 (Pro) | ₩9,900 |
| 프리미엄 (Premium) | ₩16,900 |

### 플랜별 기능 한도

| 기능 | 무료 | 기본 | 프로 | 프리미엄 |
|------|------|------|------|---------|
| AI 문자/카톡 | 3 | 15 | 30 | 70 |
| AI 스크립트 통합풀 | 0 | 10 | 20 | 45 |
| AI PDF 분석 (업로드+생성 통합 한도) | 3 | 10 | 30 | 50 |
| SNS·블로그 콘텐츠 | 0 | 0 | 10 | 20 |
| 뉴스레터 | 0 | 0 | 2 | 10 |

> **AI 스크립트 통합풀**은 AI 상담 스크립트·고객 성향분석 2개 기능이 하나의 카운터를 공유함
> (`lib/subscription/usage.ts`의 `'script'` feature)
>
> **뉴스레터 프로 2회**는 의도적인 "맛보기" — 프리미엄의 진짜 차별점은 블로그·SNS 콘텐츠
> 고용량(20 vs 프로 10)이라 뉴스레터를 프로에 소량 개방해도 프리미엄 업셀 유인이 크게
> 줄지 않는다고 판단해 2026-07-13 추가. 뉴스레터 이미지(JPG/PNG) 내보내기 기능의 발행인
> 이름·연락처는 계정 프로필(`profiles.full_name`/`phone`)에 고정되며 패널에서 직접 수정
> 불가 — 계정 하나를 여러 사람이 공유해 각자 다른 이름으로 이미지를 찍어내는 것을 막기
> 위함(`components/newsletter/newsletter-image-panel.tsx`). 이 때문에 회원가입 시 연락처가
> 필수 항목으로 바뀌었고(`components/auth/signup-form.tsx`), 프로필에 연락처가 없는 계정은
> 뉴스레터 이미지 생성이 차단되고 설정 페이지로 안내됨.
> AI 후속연락 추천, 거절극복 스크립트, 재무설계 간이 리포트, AI 상담 후기 작성 기능은 모두 제거됨
> (거절극복은 AI 상담 스크립트 자체의 [OBJECTION] 섹션과 기능이 겹쳐 별도 메뉴로 둘 가치가 낮다고
> 판단, 재무리포트·후기작성은 사용성이 낮고 통합풀 소모만 유발해서 제거)
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

## 할인코드(시연회 프로모션) 시스템

시연회(7/23·7/24, 8/3) 참석자 한정 할인코드. 결제 기존 로직은 건드리지 않고 체크아웃
시점에 선택적으로 코드를 입력한 경우에만 참조하도록 별도 테이블로 추가함 (2026-07-13).

| 코드 | 사용 예정일 | 할인율(기본/프로 · 프리미엄) | 기간 | 선착순 | 유효기한 |
|------|------------|---------------------------|------|--------|----------|
| `MET2026` | 7/23, 7/24 | 20% · 30% | 최초 3개월 | 100명 | 2026-08-10 |
| `YM2026` | 8/3 | 20% · 30% | 최초 3개월 | 100명 | 2026-08-10 |

- 두 코드 합쳐 최대 200명, **계정당 1회만** 사용 가능
- 할인은 자동결제(빌링키) 등록 기반 정기결제에만 적용 — 3개월(회차) 지나면 자동으로 정상가 전환
- DB 테이블: `discount_codes`, `discount_code_redemptions` (RLS `using(false)`, 서비스롤 전용)
- 검증/적용 로직: `lib/billing/discount.ts` (validateDiscountCode / redeemDiscountCode / getActiveRedemption)
- 결제 검증(`app/api/billing/verify/route.ts`)에서 클라이언트가 보낸 할인가를 서버에서 재검증 —
  플랜 정가 검증과 동일한 패턴으로 위변조 방지
- 갱신 결제 시 할인 재적용: `app/api/cron/subscription-check/route.ts`에서 `getActiveRedemption`으로
  남은 회차 확인 후 동일 할인율 적용, 성공 시 `incrementRedemptionUsage` 호출
- 체크아웃 UI: `components/billing/portone-checkout.tsx`의 할인코드 입력란

---

## 인프라 현황

- [x] Vercel Pro 업그레이드 완료 (2026-07-13) — Hobby 플랜의 상업적 이용 금지 약관 위반 리스크 및
      함수 타임아웃(10초→300초) 문제 해소. 프리미엄 성향분석 스크립트(Sonnet)는 응답까지 약 120초
      걸려 Hobby 플랜에서는 타임아웃으로 실패했을 가능성이 있었음
- [x] Supabase Pro 업그레이드 완료 (2026-07-13) — 무료 플랜의 7일 비활성 자동 일시정지 리스크 해소
- [x] Anthropic API 크레딧 자동충전 설정 완료 (잔액 $15 이하 시 $50 자동 충전)
- 100명 규모 기준으로는 Vercel/Supabase Pro 기본 포함 한도 안에서 충분히 커버됨 (자세한 근거는
  대화 기록 참고, 필요 시 재계산 가능)

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
- [x] AI PDF 분석 (Haiku, 3개 그룹 병렬 호출)
- [x] 블로그·SNS 콘텐츠 생성 (Haiku, 프로 이상)
- [x] 뉴스레터 생성 (Haiku, 프로 2회/프리미엄 10회)
- [x] 뉴스레터 이미지(JPG/PNG) 내보내기 — 레이아웃 6종, 폰트 3종, 발행인 정보 계정 고정
- [x] 템플릿 라이브러리 19종 (문자 10 + 스크립트 9, 프리미엄 전용 4종 포함) — `content_templates` 테이블
- [x] 생애주기 알림 (구현 중)
- [x] 오늘의 동기부여 명언 팝업 — 대시보드 진입 시 하루 1회, 날짜 기준으로 전 사용자
      공통 노출(같은 날엔 모두 같은 명언). 검증된 인물 명언 30개 + 직접 작성한
      보험 세일즈 특화 문구 93개, 총 123개 순환. `lib/content/sales-quotes.ts`,
      `components/dashboard/daily-quote-popup.tsx`. 노출 여부는 localStorage로만
      관리 — DB/서버 비용 없음, 기존 로직과 완전 분리된 추가 기능 (2026-07-14)

### 결제/구독
- [x] 요금제 페이지 (기본/프로/프리미엄)
- [x] 포트원(PortOne) 일반결제/빌링키 연동 구조 (PG 계약 승인 전)
- [x] 초과 크레딧 5개 팩 구매 플로우
- [x] 70%/90% 사용량 경고 배너
- [x] 한도 초과 배너 + 크레딧 구매 버튼

### UX
- [x] 음성 입력 (AI 문자, 스크립트, 성향분석, PDF 설명자료, 블로그 핵심메시지)
- [x] 내 결과물 보관함 저장 (스크립트, 콘텐츠 등)
- [x] 대시보드 사용량 카드 (플랜별 기능 자동 표시)
- [x] 플랜 잠금 (PlanGate 컴포넌트)

### 인프라
- [x] Supabase DB 마이그레이션 (usage_records, user_extra_credits 등)
- [x] 어드민 페이지 (사용자 관리, 빌링, CSV 내보내기)
- [x] 팀 관리 기능
- [x] 백업 로그 시스템

---

## 앞으로 할 것 (우선순위 순)

1. **[사용자 액션 필요] 일정 알림(푸시) 안 오는 문제 — VAPID 키 미설정** — 2026-07-14에 발견.
   일정(할 일) 알림 기능 자체는 정상 구현되어 있으나, 실제 발송에 필요한 VAPID 키가 Vercel에
   전혀 등록되어 있지 않아 지금까지 알림이 한 건도 발송된 적이 없었음(구독 시도도 조용히
   실패 — 이 무응답 실패는 `components/notifications/push-notification-toggle.tsx`에서 수정 완료).
   키는 이미 생성해서 대화창에 전달함 — Vercel 환경변수에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` 3개 추가 후 재배포 필요 (키 값 분실 시
   `node -e "console.log(require('web-push').generateVAPIDKeys())"`로 재생성 가능,
   재생성하면 기존 구독은 무효화되므로 사용자들 재구독 필요해짐 — 최초 설정 시엔 무관).
   추가로 **아이폰은 "홈 화면에 추가"로 설치한 상태에서만 푸시 알림이 동작함**(iOS 자체 제한,
   Safari 탭으로만 열면 VAPID 설정해도 절대 안 됨) — 사용자에게 매번 안내 필요.
   크론 주기도 하루 1회(오후 6시 KST)뿐이라 그 전 시간대 알림은 원천적으로 못 갔던 문제까지
   같이 발견해서 15분 간격으로 수정 완료 (`vercel.json`).
2. **NHN KCP 병행 신청 이어가기** — 포트원에서 "테스트모드 설정 안내" 메일 받고 검토 중이었음.
   결제 서비스 테스트 채널(포트원 관리자콘솔 → 결제연동 → 테스트 → NHN KCP)만 추가하면 되고,
   메일에 같이 언급된 "본인인증 서비스"(다날/KG이니시스) 항목은 이 앱과 무관하니 무시할 것.
3. **KPN 카드사 심사 승인 대기** — 승인 후 Vercel에 실운영 포트원 키
   (`PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`,
   `NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY`) 설정 → 실결제 테스트
4. **생애주기 알림 UI 완성** (Task #24 in_progress)
5. **고객 DB 연동** — 고객 정보 저장/불러오기로 스크립트 자동완성
6. **모바일 UX 개선** — 음성 입력, 결과 공유 등
7. 시연회(7/23·7/24·8/3) 전 전체 기능 점검 — 사용자가 직접 테스트 후 필요 시 요청 예정

---

## 개발 규칙 / 중요 결정사항

- 수익률 표 요청 시: **항상** 서버비 + 결제수수료 + 환율 ₩1,550 포함, 100%/70%/50% 시나리오 모두 표시
- AI 모델: Sonnet 5 (고품질 필요 기능), Haiku (나머지) — 임의로 바꾸지 말 것
- 크레딧 구매: 유료 플랜(basic/pro/premium)만 가능 — free 차단 필수
- 배포: `main` 브랜치 push → Vercel 자동 배포
- 타입체크: 커밋 전 `npx tsc --noEmit` 항상 실행
