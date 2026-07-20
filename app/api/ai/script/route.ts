import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { reserveUsage, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'

// 성향분석 연동 시(Sonnet + 16,000토큰 상세 프롬프트) 응답까지 실측 약 120초 걸림 — 60초로는
// Vercel 함수가 생성 도중 강제 종료되어 클라이언트에 타임아웃 에러만 반환되는 문제가 있었음.
// Vercel Pro 기본 한도(300초)보다 낮춰 잡을 이유가 없으므로 여유 있게 확보한다.
export const maxDuration = 240

const DISCLAIMER = '\n\n[보험 관련 유의사항] 이 스크립트는 AI가 생성한 참고용 자료입니다. 실제 상담 시 고객 상황에 맞게 조정하시기 바랍니다. 보험 상품의 보장 내용 및 보험료는 계약 조건에 따라 달라질 수 있으며, 가입 전 반드시 약관을 확인하시기 바랍니다.'

const SECTION_MARKERS = ['PREP', 'GREETING', 'ICEBREAK', 'NEEDS', 'AWARENESS', 'PRODUCT', 'PERSONA', 'OBJECTION', 'CLOSING', 'FOLLOWUP']

interface ScriptVars {
  customer_name: string
  gender: string
  age_group: string
  occupation: string
  marital_status: string
  has_children: string
  income_level: string
  existing_insurance: string
  product_interest: string
  consultation_purpose: string
  customer_personality: string
  expected_objections: string
  agent_style: string
  extra_notes: string
}

function customerInfoBlock(v: ScriptVars): string {
  return `고객 정보:
- 이름: ${v.customer_name}
- 성별: ${v.gender}
- 연령대: ${v.age_group}
- 직업: ${v.occupation}
- 결혼 여부: ${v.marital_status}
- 자녀 여부: ${v.has_children}
- 소득 수준: ${v.income_level}
- 기존 보험 여부: ${v.existing_insurance}
- 관심 상품: ${v.product_interest}
- 상담 목적: ${v.consultation_purpose}
- 고객 성향: ${v.customer_personality}
- 예상 반론: ${v.expected_objections}
- 설계사 스타일: ${v.agent_style}
- 추가 메모 / 분석 결과: ${v.extra_notes}`
}

// 성향분석 미연동(대부분의 기본 케이스, Haiku) — 빠르고 완결되게 간결한 버전.
// 실측 결과: 상세 버전은 Haiku가 24,000 토큰으로도 못 끝내고 3분 넘게 걸려 이 버전을 분리함.
function buildLiteScriptPrompt(v: ScriptVars): string {
  return `당신은 20년 경력의 최상위 보험 상담 전문가이자 세일즈 코치입니다. 실제 현장에서 계약 성사율이 높은 설계사들이 쓰는 검증된 스크립트를 작성합니다.

${customerInfoBlock(v)}

아래 10개 섹션을 반드시 정확히 마커로 구분하여, 각 섹션은 실전에서 바로 쓸 수 있을 만큼 구체적이되 간결하게 작성하세요 (섹션당 3~6문장 또는 3~5개 항목 수준).

[PREP] 상담 전 준비: 고객 심리 분석, 준비물, 핵심 목표, 주의할 실수
[GREETING] 오프닝 멘트 2가지 버전 + 신뢰를 쌓는 핵심 행동 팁 2가지
[ICEBREAK] 자연스러운 대화 소재 2가지 + 본론 전환 멘트 1가지
[NEEDS] 니즈 파악 질문 4~5개 + 공감 반응 예시 2~3가지
[AWARENESS] 후킹 스토리 1개(5~6문장) + 현실 인식 포인트 2가지
[PRODUCT] 상품 설명 브릿지 멘트 + 핵심 보장 설명 + 가성비 포인트 1가지
[PERSONA] 이 고객 유형에 맞는 접근법과 핵심 멘트 2~3가지
[OBJECTION] 예상 반론 대응 멘트 + 자주 나오는 반론 1가지 대응
[CLOSING] 클로징 멘트 1~2가지 + 다음 단계 제안
[FOLLOWUP] 당일 문자, 3일 후 문자, 1주일 후 문자 각 1개씩

작성 필수 조건:
- 실제 현장에서 바로 읽으며 사용할 수 있는 구어체
- 불필요한 반복 없이 핵심 위주로 간결하게
- 불안 조장 표현, 보험 가입 강요, "확정 수익률"·"무조건 지급" 등 확정적 표현 금지
- 섹션 마커 외에 --- 구분선이나 ## 마크다운 사용 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것`
}

// 리크루팅 후보 대상 상담 스크립트 — 파싱/탭 UI를 그대로 재사용하기 위해 기존 10개 마커 구성은
// 그대로 유지하고 내용만 "보험 상품 상담"에서 "설계사 리크루팅 제안 상담"으로 전환한다.
// MBTI 성향분석 연동은 리크루팅 후보에는 아직 연결돼 있지 않아 lite 버전(Haiku)만 사용한다.
function buildRecruitScriptPrompt(v: ScriptVars): string {
  return `당신은 20년 경력의 보험대리점 지점장/팀장을 돕는 리크루팅(신규 설계사 영입) 상담 코치입니다. 실제 현장에서 영입 성사율이 높은 지점장들이 쓰는 검증된 상담 스크립트를 작성합니다.

리크루팅 후보 정보:
- 이름: ${v.customer_name}
- 성별: ${v.gender}
- 연령대: ${v.age_group}
- 현재 직업: ${v.occupation}
- 결혼 여부: ${v.marital_status}
- 자녀 여부: ${v.has_children}
- 현재 수입 상황: ${v.income_level}
- 제안 포인트: ${v.product_interest}
- 상담 목적: ${v.consultation_purpose}
- 후보자 성향: ${v.customer_personality}
- 예상 반론: ${v.expected_objections}
- 상담 스타일: ${v.agent_style}
- 추가 메모: ${v.extra_notes}

아래 10개 섹션을 반드시 정확히 마커로 구분하여, 각 섹션은 실전에서 바로 쓸 수 있을 만큼 구체적이되 간결하게 작성하세요 (섹션당 3~6문장 또는 3~5개 항목 수준). 보험 상품을 파는 상담이 아니라 "보험설계사라는 직업/커리어"를 제안하는 상담입니다.

[PREP] 상담 전 준비: 이 후보자가 지금 어떤 상황·고민을 가지고 있을지 분석, 준비물, 핵심 목표, 주의할 실수
[GREETING] 오프닝 멘트 2가지 버전 + 신뢰를 쌓는 핵심 행동 팁 2가지
[ICEBREAK] 자연스러운 대화 소재 2가지 + 본론(커리어 제안) 전환 멘트 1가지
[NEEDS] 후보자의 현재 상황·고민 파악 질문 4~5개 + 공감 반응 예시 2~3가지
[AWARENESS] 비슷한 상황에서 설계사로 전환해 성공한 후킹 스토리 1개(5~6문장) + 현실 인식 포인트 2가지
[PRODUCT] 이 일(보험설계사)을 소개하는 브릿지 멘트 + "제안 포인트" 구체 설명 + 현실적인 장점 1가지
[PERSONA] 이 후보자 유형에 맞는 접근법과 핵심 멘트 2~3가지
[OBJECTION] 예상 반론 대응 멘트 + 자주 나오는 반론("안정적이지 않을 것 같다" 등) 1가지 대응
[CLOSING] 클로징 멘트 1~2가지 + 다음 단계(설명회 초대 등) 제안
[FOLLOWUP] 당일 문자, 3일 후 문자, 1주일 후 문자 각 1개씩

작성 필수 조건:
- 실제 현장에서 바로 읽으며 사용할 수 있는 구어체
- 불필요한 반복 없이 핵심 위주로 간결하게
- "무조건 성공한다", "누구나 큰 돈을 번다" 등 과장·확정 표현 금지
- 후보자의 현재 직업/상황을 깎아내리는 표현 금지
- 섹션 마커 외에 --- 구분선이나 ## 마크다운 사용 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것`
}

// 성향분석 연동(Sonnet) — 관리자 프롬프트 설정과 무관하게 항상 이 상세 버전으로 고정.
// (관리자 패널의 프롬프트가 실수로 바뀌어도 이 핵심 기능의 품질이 깨지지 않도록 코드에 고정.)
function buildAnalysisScriptPrompt(v: ScriptVars): string {
  return `당신은 20년 경력의 최상위 보험 상담 전문가이자 세일즈 코치입니다. 실제 현장에서 계약 성사율이 높은 설계사들이 쓰는 검증된 스크립트를 작성합니다.

${customerInfoBlock(v)}

※ 중요 — "추가 메모"에 다음 섹션이 있으면 반드시 전체 스크립트에 깊이 반영하세요:

[고객성향분석 결과]가 있는 경우 (최우선 적용):
- 이 분석은 MBTI 기반 심층 성향 분석입니다. 스크립트의 모든 섹션을 이 분석에 맞게 완전히 재구성하세요.
- [GREETING]: 분석에서 제시된 "추천 첫마디"를 직접 활용하거나, 해당 MBTI 성향에 맞는 오프닝으로 작성
- [ICEBREAK]: 성향분석의 접근법(예: ENFP→라포 형성 우선, ISTJ→구체적 사실 중심)에 맞는 대화 소재 선택
- [AWARENESS]: 분석에서 도출된 "니즈 예측"을 후킹 스토리의 핵심 테마로 사용
- [PRODUCT]: 추천 상품 순위와 이유를 반영하여 상품 설명 구성
- [PERSONA]: "고객 유형별 설득" 섹션에서 이 고객의 MBTI 유형을 가장 먼저/자세히 다루되, 분석의 주의사항(절대 하면 안 되는 실수, 거절 대처법)을 반드시 포함
- [OBJECTION]: 분석의 "거절 패턴"과 "주의사항"을 반영하여 이 고객에게 맞는 반론 대응 작성
- [CLOSING]: 분석에서 권장한 클로징 방식(예: P형→압박 금지/자연스러운 흐름, J형→명확한 다음 단계 제시)으로 작성
- "핵심키워드"를 스크립트 전반의 후킹 문구와 감성 어필에 활용
- 분석에서 "절대 금물"로 명시된 표현이나 접근법은 스크립트 어디에도 사용하지 말 것

[연금계산기 분석 결과]가 있는 경우: 해당 수치(준비율, 부족액, 추가 필요 저축액 등)를 스크립트 전반에 구체적으로 반영하세요.

아래 10개 섹션을 반드시 정확히 마커로 구분하여 작성하세요. 각 섹션은 충분히 길고 상세하게 작성하세요.

[PREP]
상담 전 준비 섹션 — 아래 항목 모두 포함:
1. 고객 심리 분석 (이 고객이 지금 어떤 감정과 고민을 가지고 있는지)
2. 상담 전 준비물 체크리스트 (자료, 도구, 자세)
3. 이번 상담의 핵심 목표와 성공 포인트
4. 예상되는 가장 큰 장벽과 대응 전략
5. 오늘 상담에서 절대 하지 말아야 할 실수

[GREETING]
첫 인사 섹션 — 아래 항목 모두 포함:
1. 오프닝 멘트 A (따뜻하고 신뢰감 있는 버전, 최소 5문장)
2. 오프닝 멘트 B (전문성을 앞세운 버전, 최소 5문장)
3. 오프닝 멘트 C (고객 상황에 공감하는 버전, 최소 5문장)
4. 첫 만남에서 신뢰를 쌓는 3가지 핵심 행동 팁

[ICEBREAK]
아이스브레이킹 섹션 — 아래 항목 모두 포함:
1. 시즌/날씨/최근 이슈 활용 자연스러운 대화 소재 3가지 (각 3~4문장 대화 예시 포함)
2. 고객 직업/상황에 맞는 공감 대화 소재 2가지
3. 아이스브레이킹에서 상담 본론으로 자연스럽게 연결하는 전환 멘트 2가지
4. 절대 하면 안 되는 아이스브레이킹 실수 사례

[NEEDS]
니즈 파악 섹션 — 아래 항목 모두 포함:
1. 현황 파악 개방형 질문 4개 (고객이 스스로 말하게 유도)
2. 미래 목표 확인 질문 3개
3. 고객의 진짜 고민을 끌어내는 심층 질문 3개
4. 가족 상황 연계 질문 2개
5. 질문 후 경청 및 공감 반응 예시 5가지
6. 실제 고객이 많이 하는 답변 패턴과 그에 대한 설계사의 공감 반응

[AWARENESS]
문제 인식 섹션 — 스토리텔링 중심으로 작성:
1. 강력한 후킹 스토리 — "제가 얼마 전 비슷한 상황의 고객분을 만났는데..."로 시작하는 실감나는 실제 사례 이야기 (최소 8~10문장, 감정 이입이 되도록 구체적으로)
2. 주변 지인 사례를 활용한 공감 스토리 2가지 (직장 동료, 친척 등 실생활 사례)
3. 통계와 데이터를 활용한 현실 인식 포인트 3가지
4. 고객 스스로 "맞아, 나도 그렇게 생각했는데" 하게 만드는 공감 질문 4개
5. 지금 준비하지 않으면 어떤 일이 생기는지 — 불안 조장 없이 현실적으로 설명하는 방법

[PRODUCT]
상품 설명 섹션 — 아래 항목 모두 포함:
1. 도입부: 고객의 니즈와 이 상품을 자연스럽게 연결하는 브릿지 멘트
2. 핵심 보장 설명 — 쉬운 비유와 함께 (예: "이건 마치 ~처럼...")
3. 경쟁 상품 대비 차별점 (직접 비교하지 않고 우위 강조)
4. 가성비 포인트 — "이 금액이면 하루에 ~원" 식의 생활비 환산
5. 가입 시 세제혜택 및 실질 이득 설명
6. 고객이 "오, 그렇군요" 하게 만드는 숫자/사례 포인트 3가지
7. 상품 설명 중 자주 나오는 고객 반응과 자연스러운 대처

[PERSONA]
고객 유형별 설득 섹션 — 각 유형별로 충분히 상세하게:
1. 분석형 고객 (숫자와 데이터를 요구하는 타입) — 접근법, 핵심 멘트 3가지, 주의사항
2. 감성형 고객 (가족과 관계를 중시하는 타입) — 접근법, 핵심 멘트 3가지, 스토리 활용법
3. 가격중시형 고객 (비용에 민감한 타입) — 접근법, 가치 재프레이밍 멘트 3가지
4. 바쁜형 고객 (시간이 없다고 하는 타입) — 빠른 설득 핵심 포인트, 단축 상담법
5. 불신형 고객 (보험에 부정적인 타입) — 신뢰 회복 접근법, 공감 멘트 3가지
6. 고객 유형을 파악하는 3가지 관찰 포인트

[OBJECTION]
반론 대응 섹션 — 아래 항목 모두 포함:
1. "지금 여유가 없어요" — 공감 후 재프레이밍 멘트 (최소 5문장, 구체적 대안 포함)
2. "좀 더 생각해볼게요" — 결정 미루기 대응 멘트 (최소 5문장, 부드러운 촉진)
3. "다른 보험이 더 낫지 않나요?" — 비교 반론 대응 (최소 5문장)
4. "지인이 보험은 손해라고 했어요" — 부정적 선입견 대응 (최소 5문장, 스토리 활용)
5. "온라인으로 사면 더 싸지 않나요?" — 설계사 가치 설명 멘트 (최소 5문장)
6. 고객이 말한 예상 반론: ${v.expected_objections} — 맞춤 대응 멘트 (최소 6문장)
7. 반론 대응 후 자연스럽게 클로징으로 연결하는 전환 멘트

[CLOSING]
클로징 섹션 — 아래 항목 모두 포함:
1. 클로징 A — 부드럽고 자연스러운 버전 (최소 8문장, 합의 확인 → 다음 단계 제시)
2. 클로징 B — 결단을 돕는 버전 (최소 8문장, 고객 이익 중심으로)
3. 클로징 C — 오늘 결정이 어려울 때 차선책 제시 (다음 약속 잡기)
4. 계약 직전 고객의 마음을 안심시키는 한마디
5. 계약 후 고객에게 전하는 감사/확신 멘트

[FOLLOWUP]
후속 연락 섹션 — 아래 항목 모두 포함:
1. 당일 저녁 감사 문자 (따뜻하고 짧게, 카톡 스타일)
2. 3일 후 안부 + 추가 정보 제공 문자 (부담 없이, 가치 있는 정보 한 가지 포함)
3. 1주일 후 부드러운 확인 문자 (강요 없이 다음 단계 유도)
4. 계약 미결 시 2주 후 재접촉 멘트
5. 장기 관계 유지를 위한 분기별 연락 아이디어 2가지

작성 필수 조건:
- 실제 현장에서 바로 읽으며 사용할 수 있는 구어체
- 각 섹션은 충분히 길고 실질적으로 작성 (최소 300자 이상)
- 스토리텔링 섹션은 감정 이입이 되도록 구체적이고 생생하게
- 불안 조장 표현 금지 ("지금 안 들면 큰일 납니다" 등)
- 보험 가입 강요 금지 (고객이 스스로 결정하도록)
- "확정 수익률", "무조건 지급" 등 확정적·과장 표현 금지
- 섹션 마커([PREP], [GREETING] 등) 외에 --- 구분선이나 ## 마크다운 사용 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것`
}

function parseOutputSections(raw: string, disclaimer: string = DISCLAIMER): Record<string, string> {
  const result: Record<string, string> = {}

  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const marker = SECTION_MARKERS[i]
    const nextMarker = SECTION_MARKERS[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue

    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim() + disclaimer
  }

  return result
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    customerName,
    gender,
    ageGroup,
    occupation,
    maritalStatus,
    hasChildren,
    incomeLevel,
    existingInsurance,
    productInterest,
    consultationPurpose,
    customerPersonality,
    expectedObjections,
    agentStyle,
    extraNotes,
    categoryId,
    contactType,
    forceRegenerate = false,
  } = body

  const isRecruit = contactType === 'recruit'

  if (!productInterest || !consultationPurpose) {
    return NextResponse.json(
      { error: isRecruit ? '제안 포인트와 상담 목적을 입력해주세요' : '관심 상품과 상담 목적을 입력해주세요' },
      { status: 400 }
    )
  }

  let payerId = user.id
  let borrowedTeamId: string | undefined
  try {
    const reservation = await reserveUsage(user.id, 'script')
    payerId = reservation.payerId
    borrowedTeamId = reservation.teamId
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  // 리크루팅 제안 스크립트는 보험 상품과 무관하므로 상품 카테고리 해석을 건너뛴다
  const category = isRecruit ? null : await resolveProductCategory(categoryId)

  const scriptVars = {
    customer_name: customerName || '고객',
    gender: gender || '정보 없음',
    age_group: ageGroup || '정보 없음',
    occupation: occupation || '정보 없음',
    marital_status: maritalStatus || '정보 없음',
    has_children: hasChildren || '정보 없음',
    income_level: incomeLevel || '정보 없음',
    existing_insurance: existingInsurance || '없음',
    product_interest: productInterest,
    consultation_purpose: consultationPurpose,
    customer_personality: customerPersonality || '일반적',
    expected_objections: expectedObjections || '없음',
    agent_style: agentStyle || '친근하고 전문적',
    extra_notes: extraNotes || '없음',
  }

  // 성향분석 결과가 포함된 경우 Sonnet + 상세 프롬프트로 업그레이드 (MBTI 지시 이행률 향상)
  // 관리자 프롬프트 설정과 무관하게 두 프롬프트 모두 코드에 고정 — 실측상 Haiku는 상세 버전을
  // 완결하지 못해(24,000토큰+3분 이상) 성향분석 미연동 시엔 간결한 버전을 사용해야 함.
  // 리크루팅 후보는 MBTI 성향분석 연동이 아직 없어 항상 lite(Haiku) 리크루팅 프롬프트를 사용한다.
  const hasAnalysis = !isRecruit && typeof extraNotes === 'string' && extraNotes.includes('[고객성향분석 결과]')
  const scriptModel = hasAnalysis ? 'claude-sonnet-5' : undefined // undefined = 기본 Haiku
  const scriptMaxTokens = hasAnalysis ? 16000 : 8000
  const version = isRecruit ? 'code-recruit-v1' : hasAnalysis ? 'code-analysis-v1' : 'code-lite-v1'

  let prompt = isRecruit ? buildRecruitScriptPrompt(scriptVars) : (hasAnalysis ? buildAnalysisScriptPrompt(scriptVars) : buildLiteScriptPrompt(scriptVars))
  const categoryAddendum = isRecruit ? '' : buildProductCategoryAddendum(category)
  if (categoryAddendum) prompt = `${prompt}\n\n${categoryAddendum}`
  const fullDisclaimer = isRecruit ? '' : (category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER)

  const cacheInput = {
    customerName: customerName || '', gender, ageGroup, occupation, maritalStatus,
    hasChildren, incomeLevel, existingInsurance, productInterest, consultationPurpose,
    customerPersonality, expectedObjections, agentStyle, extraNotes, categoryId: category?.id ?? null,
  }

  let result
  let sections: Record<string, string>
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: scriptMaxTokens,
      temperature: 0.75,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
      ...(scriptModel ? { model: scriptModel } : {}),
    })
    sections = parseOutputSections(result.text, fullDisclaimer)

    // Stale cache from before a prompt/format change may not contain valid markers — bypass it once
    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_script',
        userId: user.id,
        maxTokens: scriptMaxTokens,
        temperature: 0.7,
        cacheInput,
        promptVersion: version,
        forceRegenerate: true,
        ...(scriptModel ? { model: scriptModel } : {}),
      })
      sections = parseOutputSections(result.text, fullDisclaimer)
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_script' } })
  }

  const wasCached = !!result.cachedAt

  if (!wasCached) {
    await incrementUsage(payerId, 'script', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
      teamId: borrowedTeamId,
    })
    await trackFeatureComplete('ai_script', user.id, {
      productInterest,
      consultationPurpose,
      cached: false,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'script')

  return NextResponse.json({
    sections,
    rawText: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
    promptVersion: version,
  })
}
