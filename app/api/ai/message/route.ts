import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { reserveUsage, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { notifyUsageLimitWarning } from '@/lib/notifications/create-notification'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'

const DISCLAIMER = '\n\n[보험 관련 유의사항] 이 메시지는 보험 상품에 대한 일반적인 안내 목적으로 작성되었습니다. 보험 상품 가입 전 약관을 반드시 확인하시기 바랍니다. 보험료 및 보장 내용은 계약 조건에 따라 달라질 수 있습니다.'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-5'

// "설득력 있는 버전"이 Sonnet을 호출하는데 maxDuration이 없으면 Vercel 기본 타임아웃
// (Pro 기준 무설정 시 15초)에 걸릴 수 있음 (2026-07-21 AI 기능 재검토로 발견, script/
// customer-analysis 라우트와 동일한 버그 패턴 방어).
export const maxDuration = 240

// SMS, KAKAO, SOFT, FOLLOWUP → Haiku (저렴한 모델)
const HAIKU_SECTIONS = ['SMS', 'KAKAO', 'SOFT', 'FOLLOWUP'] as const
// PERSUASIVE → Sonnet (고품질 모델)
const SONNET_SECTIONS = ['PERSUASIVE'] as const

// 모델이 마커 아래 괄호 안 지시문(예: "(카카오톡용 - 800~1000자, ...)")을 실제 메시지 내용인 것처럼
// 그대로 옮겨 적는 경우가 있어(간혹 "카토톡용"처럼 오타까지 섞여 나옴), 섹션 첫 줄이 이 지시문
// 패턴과 일치하면 방어적으로 제거한다.
function stripLeakedInstruction(text: string): string {
  const lines = text.split('\n')
  if (lines[0] && /^\(.*\d+[~-]\d+자.*\)$/.test(lines[0].trim())) {
    lines.shift()
    while (lines[0] === '') lines.shift()
  }
  return lines.join('\n')
}

// 모델이 프롬프트의 "5단계 구조" 설명(①②③④⑤)을 실제 출력 서식으로 오해해 문단 앞에 그대로
// 붙이거나, 섹션 사이에 마크다운 구분선(---, ##)을 끼워 넣는 경우가 있어 방어적으로 제거한다.
function cleanSectionText(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^[①②③④⑤]\s*/, ''))
    .join('\n')
    .replace(/\n+-{2,}\n+#{1,6}\s*$/, '')
    .replace(/\n+-{2,}\s*$/, '')
    .trim()
}

// markers는 그 raw 텍스트를 생성한 프롬프트가 실제로 요청한 마커 목록·순서와 정확히 일치해야
// 한다 — Haiku 응답(SMS/KAKAO/SOFT/FOLLOWUP)과 Sonnet 응답(PERSUASIVE)을 하나의 고정 마커
// 목록으로 같이 파싱하면, 존재하지 않는 다음 마커를 찾지 못해 마지막 섹션의 내용이 통째로
// 앞 섹션에 잘못 붙어버리는 문제가 있었다(예: SOFT가 PERSUASIVE를 못 찾아 FOLLOWUP까지 삼킴).
function parseOutputSections(raw: string, markers: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {}

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const nextMarker = markers[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue

    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = cleanSectionText(stripLeakedInstruction(raw.slice(contentStart, end !== -1 ? end : raw.length).trim()))
  }

  return result
}

// customers.mbti_type만 저장돼 있고 별도의 저장된 성향분석(hasAnalysis)이 없는 경우 —
// 심층 분석 없이 MBTI 코드만으로 과하게 단정짓지 않도록, 톤 조정 수준의 가벼운 지침만 추가한다.
// hasAnalysis가 있으면 buildPersonalityAddendum이 훨씬 상세히 다루므로 이쪽은 쓰지 않는다.
function buildMbtiAddendum(mbti: string): string {
  return `
※ 참고 — 이 상대방의 MBTI는 ${mbti}입니다. 별도로 저장된 성향분석 결과는 없으므로, 아래처럼
각 알파벳(E/I, T/F, J/P)이 의미하는 성향만 가볍게 참고해서 문체와 어투를 자연스럽게
조정하세요 — 심층 분석이 아니라 톤 조정 수준으로만 가볍게 활용하고 과하게 단정짓지 마세요:
- E(외향) 시작: 조금 더 활기차고 적극적인 어투 / I(내향) 시작: 차분하고 부담 없는 어투
- T(사고) 포함: 근거·수치·논리 중심 설명 / F(감정) 포함: 공감·관계·스토리 중심 설명
- J(판단)로 끝: 명확한 다음 단계·결론 제시 / P(인식)로 끝: 선택지를 열어두고 부담 없이 제안
- 이 성향 정보는 어투 참고용일 뿐이며, 메시지의 주제·상품 내용에는 영향을 주지 않습니다.`
}

function buildPersonalityAddendum(productField: string): string {
  return `
※ 중요 — "특별 보장 내용" 안에 [고객성향분석 결과]가 포함되어 있다면, 그 안의 MBTI/성향 정보를
반드시 반영하여 모든 버전의 문체·어조·설득 방식을 이 고객에게 맞게 조정하세요. 단, 이 정보는
오직 "말투·접근 방식" 참고용이며 메시지의 주제/상품과는 무관합니다:
- 분석에서 제시된 "추천 첫마디"가 있다면 자연스럽게 녹여서 활용
- 이 고객 성향에 맞는 문장 길이·어투(예: 신중한 성향이면 근거와 수치 중심, 감성적 성향이면 공감과 스토리 중심)
- 분석에서 "절대 금물"로 명시된 표현이나 접근법은 어떤 버전에도 사용하지 말 것
- 매우 중요: [고객성향분석 결과] 안에 다른 보험 상품명이나 기존 가입 상품이 언급되어 있어도,
  그 상품을 절대 이번 메시지의 주제로 삼지 마세요. 이번 메시지가 다뤄야 할 상품은
  오직 "상품 분야: ${productField}" 하나뿐입니다. 성향분석 결과는 문체 참고용으로만 쓰고,
  상품/보장 내용 설명은 반드시 "${productField}" 기준으로만 작성하세요.`
}

function buildHaikuPrompt(vars: Record<string, string>, categoryAddendum: string, hasAnalysis: boolean, mbti?: string): string {
  return `당신은 보험설계사를 돕는 전문 메시지 작성 AI입니다.

고객 정보:
- 이름: ${vars.customer_name}
- 연령대: ${vars.age_group}
- 직업: ${vars.occupation}
- 관계: ${vars.relationship}
- 목적: ${vars.purpose}
- 상품 분야: ${vars.product_field}
- 선호 말투: ${vars.tone}
- 특별 보장 내용(후킹 포인트): ${vars.extra_notes}
${hasAnalysis ? buildPersonalityAddendum(vars.product_field) : (mbti ? buildMbtiAddendum(mbti) : '')}

아래 4가지 버전의 메시지를 반드시 마커로 구분하여 작성하세요.
모든 버전은 "관심 유도 → 공감 사례 스토리 → 상품 핵심 설명 → 차별화 포인트 → 자연스러운 마무리"
흐름을 속으로 따르되, 이 5단계 구분은 내용을 구성하는 흐름일 뿐 실제 메시지에 그대로 드러나는
형식이 아닙니다. 각 마커 아래 괄호 안 문구도 어떤 내용을 써야 하는지 알려주는 지시사항일 뿐입니다.
이 지시문이나 단계 설명 자체를 메시지 본문에 옮겨 쓰지 말고, 번호(①②③, 1. 2. 3. 등)나 글머리
기호(-, • 등)도 붙이지 말고, 오직 자연스러운 줄글 문단으로만 실제 메시지 내용을 작성하세요.

[SMS]
(LMS 문자용 - 800~1000자, 문어체·격식체, 5단계 구조 포함, 이모지 최소화)

[KAKAO]
(카카오톡용 - 800~1000자, 구어체·친근체, 이모지 3~5개 자연스럽게 삽입, 5단계 구조 포함)

[SOFT]
(부드러운 버전 - 400~500자, 공감·배려 중심, 압박감 없이 선택권 부여, 5단계 구조 포함)

[FOLLOWUP]
(후속 연락용 - 300~500자, 이전 상담 리마인드 형태로 5단계 압축, 이모지 1~2개)

작성 주의사항:
- 보험 가입 강요 금지, "무조건"·"100%" 등 과장 표현 금지
- "확정 보장"·"반드시 지급" 등 확정적 표현 금지
- 문단 앞에 번호(①②③, 1. 2. 3. 등)나 글머리 기호(-, • 등) 붙이지 말 것 — 자연스러운 줄글로만 작성
- 마크다운 기호(#, ##, **, --- 구분선 등) 절대 사용 금지, 마커([SMS] 등) 외 다른 기호로 섹션 구분하지 말 것
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것${categoryAddendum ? `\n\n${categoryAddendum}` : ''}`
}

function buildSonnetPrompt(vars: Record<string, string>, categoryAddendum: string, hasAnalysis: boolean, mbti?: string): string {
  return `당신은 보험설계사를 돕는 전문 메시지 작성 AI입니다.

고객 정보:
- 이름: ${vars.customer_name}
- 연령대: ${vars.age_group}
- 직업: ${vars.occupation}
- 관계: ${vars.relationship}
- 목적: ${vars.purpose}
- 상품 분야: ${vars.product_field}
- 선호 말투: ${vars.tone}
- 특별 보장 내용(후킹 포인트): ${vars.extra_notes}
${hasAnalysis ? buildPersonalityAddendum(vars.product_field) : (mbti ? buildMbtiAddendum(mbti) : '')}

아래 1가지 버전의 메시지를 반드시 마커로 구분하여 작성하세요. 마커 아래 괄호 안 문구는 어떤
내용을 써야 하는지 알려주는 지시사항일 뿐이니, 그 문구 자체를 메시지 본문에 옮겨 쓰지 마세요:

[PERSUASIVE]
(강력한 스토리텔링 설득 메시지 - 반드시 1200~1500자. 다음 5단계 구조를 모두 포함하되, 각
 단계를 더 구체적이고 풍성하게 작성하세요:
 ①후킹: 고객 연령대·직업에 딱 맞는 질문 또는 공감 오프닝 2~3줄
 ②스토리: 실제 있을 법한 3인칭 사례를 5~7문장으로 생생하게 묘사 (상황·감정·결과 포함)
 ③설명: "특별 보장 내용(후킹 포인트)" 내용이 있으면 구체적 수치·조건과 함께 반드시 언급, 없으면 보장 공백 디테일하게 (3~4문장)
 ④강조: 왜 지금 이 시점에 알아보는 것이 합리적인지 2~3문장
 ⑤마무리: 답장·문의를 부드럽게 유도하는 CTA 2~3줄
 반드시 5단계 모두 포함, 1200자 이상이어야 합니다.)

작성 주의사항:
- 보험 가입 강요 금지, "무조건"·"100%" 등 과장 표현 금지
- "확정 보장"·"반드시 지급" 등 확정적 표현 금지
- 문단 앞에 번호(①②③, 1. 2. 3. 등)나 글머리 기호(-, • 등) 붙이지 말 것 — 자연스러운 줄글로만 작성
- 마크다운 기호(#, ##, **, --- 구분선 등) 절대 사용 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것${categoryAddendum ? `\n\n${categoryAddendum}` : ''}`
}

// ── 리크루팅 후보용 프롬프트 (기존 고객 대상 상품 제안 프롬프트와 구조는 동일하게 유지 —
// 파싱/탭 UI를 그대로 재사용하기 위해 마커 구성만 똑같이 맞추고 내용만 리크루팅 제안으로 전환) ──

function buildRecruitHaikuPrompt(vars: Record<string, string>, mbti?: string): string {
  return `당신은 보험대리점 지점장/팀장을 돕는 리크루팅(신규 설계사 영입) 메시지 작성 AI입니다.

리크루팅 후보 정보:
- 이름: ${vars.customer_name}
- 연령대: ${vars.age_group}
- 현재 직업: ${vars.occupation}
- 관계: ${vars.relationship}
- 제안 목적: ${vars.purpose}
- 어필 포인트: ${vars.product_field}
- 선호 말투: ${vars.tone}
- 참고 메모: ${vars.extra_notes}
${mbti ? buildMbtiAddendum(mbti) : ''}

아래 4가지 버전의 메시지를 반드시 마커로 구분하여 작성하세요. 보험 상품을 파는 메시지가 아니라
"보험설계사라는 직업/커리어"를 제안하는 메시지입니다. 강요하거나 과장하지 말고, 상대방의 현재
상황(직업, 관계)을 존중하며 자연스럽게 관심을 유도하세요. 각 마커 아래 괄호 안 문구는 지시사항일
뿐이니 그대로 옮겨 쓰지 마세요.

[SMS]
(LMS 문자용 - 800~1000자, 문어체·격식체. 안부 → 왜 이 사람에게 제안하는지 → 어필 포인트 설명 → 부담 없는 제안 → 마무리)

[KAKAO]
(카카오톡용 - 800~1000자, 구어체·친근체, 이모지 3~5개. 위와 같은 흐름을 편하게 풀어서)

[SOFT]
(부드러운 버전 - 400~500자, 부담 주지 않는 톤. "생각 있으면 편하게 연락줘" 정도의 가벼운 제안)

[FOLLOWUP]
(후속 연락용 - 300~500자, 이전 대화를 리마인드하며 다시 한번 가볍게 제안)

작성 주의사항:
- "무조건 성공한다", "누구나 큰 돈을 번다" 등 과장·확정 표현 금지
- 상대방의 현재 직업/상황을 깎아내리는 표현 금지
- "월 OOO만원", "연봉 O억" 등 구체적인 소득 금액·숫자를 절대 지어내지 말 것 — 실존하지 않는
  인물의 확정적 소득을 제시하면 리크루팅 과장 광고로 문제될 수 있음. 소득을 언급할 땐
  "이전보다 안정적인 수입", "노력한 만큼 벌 수 있는 구조"처럼 방향성만 표현
- 문단 앞에 번호나 글머리 기호 붙이지 말 것 — 자연스러운 줄글로만 작성
- 마크다운 기호(#, ##, **, --- 구분선 등) 절대 사용 금지, 마커([SMS] 등) 외 다른 기호로 섹션 구분하지 말 것`
}

function buildRecruitSonnetPrompt(vars: Record<string, string>, mbti?: string): string {
  return `당신은 보험대리점 지점장/팀장을 돕는 리크루팅(신규 설계사 영입) 메시지 작성 AI입니다.

리크루팅 후보 정보:
- 이름: ${vars.customer_name}
- 연령대: ${vars.age_group}
- 현재 직업: ${vars.occupation}
- 관계: ${vars.relationship}
- 제안 목적: ${vars.purpose}
- 어필 포인트: ${vars.product_field}
- 선호 말투: ${vars.tone}
- 참고 메모: ${vars.extra_notes}
${mbti ? buildMbtiAddendum(mbti) : ''}

아래 1가지 버전의 메시지를 반드시 마커로 구분하여 작성하세요:

[PERSUASIVE]
(강력한 스토리텔링 제안 메시지 - 반드시 1200~1500자. 다음 흐름을 포함하되 더 구체적이고 풍성하게:
 ①공감 오프닝: 상대방의 현재 상황(직업/생애주기)에 맞는 공감 질문 2~3줄
 ②스토리: 비슷한 상황에서 보험설계사로 전환해 성공한 3인칭 사례를 5~7문장으로 생생하게
   (구체적인 소득 금액·숫자는 지어내지 말고 "충분한 수입을 만들 수 있었다"처럼 정성적으로만 표현)
 ③어필: "어필 포인트"를 구체적으로 설명 (3~4문장)
 ④왜 지금: 왜 지금이 고려해볼 타이밍인지 2~3문장
 ⑤마무리: 부담 없는 만남/설명회 제안 CTA 2~3줄
 반드시 5단계 모두 포함, 1200자 이상이어야 합니다.)

작성 주의사항:
- "무조건 성공한다", "누구나 큰 돈을 번다" 등 과장·확정 표현 금지
- 상대방의 현재 직업/상황을 깎아내리는 표현 금지
- "월 OOO만원", "연봉 O억" 등 구체적인 소득 금액·숫자를 절대 지어내지 말 것 — 실존하지 않는
  인물의 확정적 소득을 제시하면 리크루팅 과장 광고로 문제될 수 있음. 소득을 언급할 땐
  "이전보다 안정적인 수입", "노력한 만큼 벌 수 있는 구조"처럼 방향성만 표현
- 문단 앞에 번호나 글머리 기호 붙이지 말 것 — 자연스러운 줄글로만 작성
- 마크다운 기호(#, ##, **, --- 구분선 등) 절대 사용 금지`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    customerName,
    ageGroup,
    occupation,
    relationship,
    purpose,
    productField,
    categoryId,
    tone,
    length,
    extraNotes,
    contactType,
    mbtiType,
    forceRegenerate = false,
  } = body

  const isRecruit = contactType === 'recruit'

  if (!purpose || !productField) {
    return NextResponse.json(
      { error: isRecruit ? '목적과 제안 포인트를 입력해주세요' : '목적과 상품 분야를 입력해주세요' },
      { status: 400 }
    )
  }

  let payerId = user.id
  let borrowedTeamId: string | undefined
  try {
    const reservation = await reserveUsage(user.id, 'sms')
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

  // 리크루팅 제안 메시지는 보험 상품과 무관하므로 상품 카테고리 해석·고지문을 건너뛴다
  const category = isRecruit ? null : await resolveProductCategory(categoryId)
  const categoryAddendum = isRecruit ? '' : (buildProductCategoryAddendum(category) ?? '')
  const fullDisclaimer = isRecruit ? '' : (category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER)

  const vars = {
    customer_name: customerName || '고객',
    age_group: ageGroup || '정보 없음',
    occupation: occupation || '정보 없음',
    relationship: relationship || '정보 없음',
    purpose,
    product_field: productField,
    tone: tone || '친근체',
    extra_notes: extraNotes || '없음',
  }

  const hasAnalysis = typeof extraNotes === 'string' && extraNotes.includes('[고객성향분석 결과]')
  const mbti = typeof mbtiType === 'string' && mbtiType ? mbtiType : undefined
  const haikuPrompt = isRecruit ? buildRecruitHaikuPrompt(vars, mbti) : buildHaikuPrompt(vars, categoryAddendum, hasAnalysis, mbti)
  const sonnetPrompt = isRecruit ? buildRecruitSonnetPrompt(vars, mbti) : buildSonnetPrompt(vars, categoryAddendum, hasAnalysis, mbti)

  const baseCacheInput = {
    customerName: customerName || '',
    ageGroup, occupation, relationship, purpose, productField,
    categoryId: category?.id ?? null, tone, extraNotes,
    mbti: mbti ?? null,
    promptSplit: 'v1',
  }

  let haikuResult: Awaited<ReturnType<typeof generateWithAI>>
  let sonnetResult: Awaited<ReturnType<typeof generateWithAI>>

  try {
    // 병렬 호출 — Haiku(4가지) + Sonnet(설득력 버전) 동시 생성
    ;[haikuResult, sonnetResult] = await Promise.all([
      generateWithAI(haikuPrompt, {
        feature: 'ai_message',
        userId: user.id,
        model: HAIKU_MODEL,
        // SMS(800~1000자)+KAKAO(800~1000자)+SOFT(400~500자)+FOLLOWUP(300~500자) 4개 섹션을
        // 한 번에 생성하는데 2500으로는 부족해 마지막 FOLLOWUP 섹션이 중간에 잘렸음 — 그 잘린
        // 내용이 SOFT 파싱 버그(위 parseOutputSections 주석 참고)와 겹쳐 SOFT 탭에 잘못 붙어
        // 보이는 문제로 이어졌음.
        maxTokens: 5000,
        temperature: 0.75,
        cacheInput: { ...baseCacheInput, split: 'haiku' },
        forceRegenerate,
      }),
      generateWithAI(sonnetPrompt, {
        feature: 'ai_message',
        userId: user.id,
        model: SONNET_MODEL,
        maxTokens: 4096, // 700~1000자 한글 5단계 구조 응답이 3000에서도 문장 중간에 잘리는 사례가
                         // 실사용자에게 발생해 상향(1500→3000 때와 동일한 문제 재발, 여유를 더 확보)
        temperature: 0.75,
        cacheInput: { ...baseCacheInput, split: 'sonnet' },
        forceRegenerate,
      }),
    ])
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_message', purpose, productField } })
  }

  // 섹션 파싱 및 병합 — 각 raw 텍스트는 그걸 생성한 프롬프트의 마커 목록으로만 파싱한다
  const sections: Record<string, string> = {
    ...parseOutputSections(haikuResult.text, HAIKU_SECTIONS),
    ...parseOutputSections(sonnetResult.text, SONNET_SECTIONS),
  }

  // 고지문 추가
  const withDisclaimer: Record<string, string> = {}
  for (const [k, v] of Object.entries(sections)) {
    withDisclaimer[k] = v + fullDisclaimer
  }

  // 두 결과 모두 캐시된 경우에만 사용량 차감 건너뜀
  const wasCached = !!(haikuResult.cachedAt && sonnetResult.cachedAt)

  if (!wasCached) {
    const totalInput = haikuResult.usage.inputTokens + sonnetResult.usage.inputTokens
    const totalOutput = haikuResult.usage.outputTokens + sonnetResult.usage.outputTokens
    await incrementUsage(payerId, 'sms', {
      tokenInput: totalInput,
      tokenOutput: totalOutput,
      teamId: borrowedTeamId,
    })
    await trackFeatureComplete('ai_message', user.id, {
      productField,
      purpose,
      cached: false,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'sms')

  if (afterCheck.limit > 0 && afterCheck.used / afterCheck.limit >= 0.8) {
    notifyUsageLimitWarning(user.id, 'AI 문자', afterCheck.used, afterCheck.limit).catch(() => {})
  }

  return NextResponse.json({
    sections: withDisclaimer,
    rawText: `${haikuResult.text}\n\n${sonnetResult.text}`,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: `${haikuResult.provider}+${sonnetResult.provider}`,
    model: `${HAIKU_MODEL}(×4) + ${SONNET_MODEL}(×1)`,
    promptVersion: 'split-v1',
  })
}
