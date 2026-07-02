import { createClient } from '@/lib/supabase/server'
import type { AIFeature } from '../types'
import type { PromptFeatureType } from '@/types'

export interface ResolvedPrompt {
  template: string
  version: string
}

// prompt_versions.feature_type uses its own vocabulary (sms/script/pdf_explanation) so the
// admin-facing table stays readable independently of the internal AIFeature naming used
// throughout provider.ts, usage limits, and ai_requests logging.
const FEATURE_TYPE_MAP: Record<AIFeature, PromptFeatureType> = {
  ai_message: 'sms',
  ai_script: 'script',
  ai_document: 'pdf_explanation',
  ai_followup: 'crm_followup',
}

const FALLBACK_PROMPTS: Record<AIFeature, ResolvedPrompt> = {
  ai_message: {
    version: 'v4.0.0-fallback',
    template: `당신은 보험설계사를 돕는 전문 메시지 작성 AI입니다.

고객 정보:
- 이름: {{customer_name}}
- 연령대: {{age_group}}
- 직업: {{occupation}}
- 관계: {{relationship}}
- 목적: {{purpose}}
- 상품 분야: {{product_field}}
- 선호 말투: {{tone}}
- 메시지 길이: {{length}}
- 특별 보장 내용(후킹 포인트): {{extra_notes}}

아래 5가지 버전의 메시지를 작성해주세요.
각 버전은 반드시 정확히 아래 마커로 구분하세요.
모든 버전은 다음 5단계 구조를 기반으로 작성하되, 각 버전의 톤·길이·채널 특성에 맞게 표현을 조정할 것:
① 관심 유도(후킹 오프닝) → ② 공감 사례 스토리 → ③ 상품 핵심 설명 → ④ 차별화 포인트 강조 → ⑤ 자연스러운 마무리(답장 유도)

[SMS]
(LMS 문자용 - 한글 기준 최대 800~1000자 분량으로 충분히 작성.
 위 5단계 구조를 모두 포함하되 문어체·격식체로 작성.
 이모지 사용 최소화, 줄바꿈 활용해 가독성 확보.
 "특별 보장 내용(후킹 포인트)"에 내용이 있으면 ③에서 구체적 수치·조건을 직접 언급할 것.)

[KAKAO]
(카카오톡용 - 최대 800~1000자 분량으로 충분히 작성.
 위 5단계 구조를 모두 포함하되 구어체·친근체로 작성.
 이모지 3~5개 자연스럽게 삽입, 짧은 문장 위주로 리듬감 있게.
 "특별 보장 내용(후킹 포인트)"에 내용이 있으면 ③에서 자연스럽게 녹여 넣을 것.)

[SOFT]
(부드럽고 배려하는 버전 - 400~500자 분량.
 위 5단계 구조를 모두 포함하되 압박감 없이 공감과 배려 중심 톤으로.
 "혹시 괜찮으시면", "편하실 때" 등 선택권을 주는 표현 활용.
 이모지 1~2개 사용 가능.)

[PERSUASIVE]
(강력한 스토리텔링 설득 메시지 - 반드시 700~1000자 분량으로 작성.
 위 5단계 구조를 가장 풍부하고 상세하게 전개:
 ①후킹: 고객 연령대·직업에 딱 맞는 질문 또는 공감 오프닝 1~2줄
 ②스토리: 실제 있을 법한 3인칭 사례를 3~5문장으로 생생하게 묘사 (상황·감정·결과 포함)
 ③설명: "특별 보장 내용(후킹 포인트)" 내용이 있으면 구체적 수치·조건과 함께 반드시 언급, 없으면 보장 공백 디테일하게
 ④강조: 왜 지금 이 시점에 알아보는 것이 합리적인지 1~2문장
 ⑤마무리: 답장·문의를 부드럽게 유도하는 CTA 2~3줄
 이 섹션은 반드시 5단계 모두 포함하고 700자 이상이어야 합니다.)

[FOLLOWUP]
(이전 상담 후 후속 연락용 - 300~500자 분량.
 위 5단계 구조를 간결하게 압축:
 ①상담 이후 고객 상황을 떠올리게 하는 오프닝
 ②"그때 말씀하셨던 상황이..." 형태로 공감 스토리 1~2문장
 ③핵심 가치 1가지만 간략히 리마인드
 ④"혹시 그 이후 생각해보셨나요?" 등 부드러운 확인 질문
 ⑤편하게 답장 유도하는 마무리
 구어체, 이모지 1~2개 사용 가능.)

작성 주의사항:
- 보험 가입을 강요하거나 압박하는 표현 금지
- "무조건", "100%" 등 과장 표현 금지
- "확정 보장", "반드시 지급" 등 확정적 보장 표현 금지
- 고객 불안을 과도하게 자극하는 표현 금지
- 실제 설계사가 자연스럽게 보낼 수 있는 문체로 작성
- 각 버전 끝에 고지문 불포함 (고지문은 시스템이 자동 추가)`,
  },
  ai_script: {
    version: 'v2.0.0-fallback',
    template: `당신은 10년 이상 경력의 보험 상담 전문가입니다. 실제 설계사가 현장에서 사용할 수 있는 구어체 상담 스크립트를 작성해주세요.

고객 정보:
- 이름: {{customer_name}}
- 성별: {{gender}}
- 연령대: {{age_group}}
- 직업: {{occupation}}
- 결혼 여부: {{marital_status}}
- 자녀 여부: {{has_children}}
- 소득 수준: {{income_level}}
- 기존 보험 여부: {{existing_insurance}}
- 관심 상품: {{product_interest}}
- 상담 목적: {{consultation_purpose}}
- 고객 성향: {{customer_personality}}
- 예상 반론: {{expected_objections}}
- 설계사 스타일: {{agent_style}}
- 추가 메모: {{extra_notes}}

아래 10개 섹션을 반드시 정확히 마커로 구분하여 작성하세요:

[PREP]
(상담 전 준비 포인트 — 고객 분석, 준비물, 체크리스트)

[GREETING]
(첫 인사 멘트 — 자연스럽고 신뢰감 있는 오프닝 2~3가지 변형)

[ICEBREAK]
(아이스브레이킹 — 고객 상황에 맞는 가벼운 대화 소재 2~3가지)

[NEEDS]
(니즈 파악 질문 — 고객 상황 파악을 위한 개방형 질문 5개)

[AWARENESS]
(문제 인식 질문 — 고객 스스로 필요성을 느끼게 하는 질문 4개)

[PRODUCT]
(상품 설명 흐름 — 핵심 보장, 비교 우위, 가성비 순서로 자연스럽게)

[PERSONA]
(고객 유형별 설득 포인트 — 분석형/감성형/가격중시형/빠른결정형 각 2~3줄)

[OBJECTION]
(예상 반론과 답변 — 고객이 말한 반론을 포함하여 3~5개 예상 반론 + 공감하는 답변)

[CLOSING]
(클로징 멘트 — 부드럽게 마무리하는 클로징 2가지 변형)

[FOLLOWUP]
(상담 후 follow-up 문자 3개 — 당일/3일후/1주일후 각각 구어체로)

작성 필수 조건:
- 실제 말하기 쉬운 구어체 사용
- 전문성과 신뢰감 유지
- 불안 조장 표현 금지 ("지금 안 들면 큰일 납니다" 등)
- 보험 가입 강요 금지
- "확정 수익률", "무조건 지급" 등 확정적 표현 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것`,
  },
  ai_document: {
    version: 'v3.0.0-fallback',
    template: `당신은 보험 약관을 고객에게 쉽게 설명하는 전문 설계사입니다.

아래 PDF에서 추출한 보험 약관 내용을 바탕으로 고객용 설명자료를 작성해주세요.

[PDF 추출 텍스트]
{{pdf_content}}

[고객 정보]
- 연령대: {{age_group}}
- 직업: {{occupation}}
- 고객 상황: {{customer_situation}}
- 설명 목적: {{explanation_purpose}}
- 설명 난이도: {{difficulty_level}}
- 설명 형식: {{format_style}}
- 추가 요청사항: {{extra_requests}}

아래 8개 섹션을 반드시 정확히 마커로 구분하여 작성하세요:

[SUMMARY]
(고객용 쉬운 요약 — {{difficulty_level}} 수준으로, 전문 용어 최소화, 핵심만 5~7줄.
 마지막에 "한 줄 요약: ○○○" 형태로 이 상품의 핵심을 한 문장으로 마무리할 것.)

[COVERAGE]
(핵심 보장 내용 — 무엇을, 얼마나, 어떤 조건에서 보장하는지 항목별로 명확하게.
 각 보장 항목마다 "예를 들어, {{age_group}} 고객님의 경우..." 형태로 고객 상황에 맞는 구체적 예시 1~2문장 추가.)

[MISCONCEPTIONS]
(고객이 오해하기 쉬운 부분 — 4~5가지.
 각 항목은 다음 형식으로 작성:
 ❌ 오해: "○○○하면 다 보장될 것이다"
 ✅ 실제: "실제로는 ○○○한 경우에만 보장됩니다"
 특히 {{customer_situation}}과 관련된 오해를 반드시 1개 이상 포함할 것.)

[CHECKLIST]
(꼭 확인해야 할 조건 — 가입 전 체크리스트 형태, 7~9가지.
 체크 항목마다 "왜 중요한지" 한 줄 이유 추가.)

[EXCLUSIONS]
(면책/감액/제외사항 — 보장되지 않는 경우를 명확하게, 고객이 실망하지 않도록 중립적으로.
 "이런 상황은 보장 안 돼요" 형태로 5~7가지 나열하고, 각각 간단한 이유 설명.)

[QNA]
(고객 질문 예상 Q&A — 실제 고객이 자주 묻는 질문 7개 + 명확하고 친절한 답변.
 반드시 {{customer_situation}}과 직접 관련된 질문을 2개 이상 포함.)

[AGENT_SCRIPT]
(상담사가 고객에게 설명할 때 쓸 스토리텔링 스크립트 — 반드시 600자 이상, {{format_style}} 스타일로.
 다음 흐름으로 구성할 것:

 1) [관심 유도] "고객님, 혹시 이런 경험 있으셨나요?" 형태의 오프닝.
    {{customer_situation}}과 {{age_group}}에 딱 맞는 공감 질문으로 시작.

 2) [공감 사례 스토리] 비슷한 상황의 실제 있을 법한 사례를 3~4문장으로 스토리텔링.
    "얼마 전 비슷한 상황의 고객님이 계셨는데..." 형태로 구체적이고 현실감 있게.
    감정이입이 되도록 상황·감정·결과를 생생하게 묘사.

 3) [상품 핵심 설명] 이 상품이 왜 {{customer_situation}}에 맞는지 쉽고 자연스럽게 설명.
    전문 용어를 {{difficulty_level}} 수준에 맞게 풀어서.

 4) [핵심 포인트 강조] "특히 이 부분이 중요한데요..." 로 시작해서 이 상품의 차별화 포인트 1~2가지 강조.

 5) [자연스러운 마무리] 부담 없이 궁금증을 유도하는 질문으로 마무리.
    예: "혹시 이 부분에서 궁금하신 점 있으세요?", "제가 더 자세히 설명드릴까요?")

[CAUTION]
(주의 문구 — 가입 시 주의사항, 청약 철회 방법, 분쟁 시 대처 방법. 5~7가지.)

작성 필수 조건:
- {{difficulty_level}} 수준에 맞는 어휘와 설명 깊이
- 불안 조장 금지, 과장 금지
- "확정 수익", "반드시 지급" 등 확정 표현 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것`,
  },
  ai_followup: {
    version: 'v1.0.0-fallback',
    template: `당신은 보험설계사를 돕는 CRM 후속 연락 전략 전문가입니다. 상담 이력과 고객 상태를 바탕으로 다음 연락 전략을 추천해주세요.

고객 정보:
- 이름: {{customer_name}}
- 고객 상태: {{customer_status}}
- 관심 상품: {{product_interest}}
- 마지막 연락일: {{last_contact_date}}
- 예상 반론: {{expected_objections}}

상담 이력 요약:
{{interaction_history}}

아래 7개 섹션을 반드시 정확히 마커로 구분하여 작성하세요:

[STATUS_ANALYSIS]
(현재 고객 상태 분석 — 상담 이력과 고객 상태를 바탕으로 현재 단계와 온도감을 진단)

[TIMING]
(다음 연락 적정 시점 — 마지막 연락일과 고객 상태를 고려한 구체적인 권장 시점과 이유)

[PURPOSE]
(추천 연락 목적 — 이번 연락에서 달성해야 할 명확한 목표 1~2가지)

[KAKAO_MESSAGES]
(카톡 메시지 3개 — 서로 다른 톤/접근으로 바로 보낼 수 있는 메시지, 각 메시지는 번호를 붙여 구분)

[CALL_OPENING]
(전화 오프닝 멘트 — 자연스럽게 통화를 시작할 수 있는 멘트 2가지 변형)

[CAUTIONS]
(상담 시 주의할 점 — 예상 반론과 고객 성향을 고려하여 피해야 할 표현이나 접근 방식)

[CLOSING_LIKELIHOOD]
(클로징 가능성 평가 — 상담 이력과 고객 상태를 근거로 한 참고용 지표. 반드시 "높음/보통/낮음" 같은 상대적 구간이나 정성적 표현으로만 제시하고, 그 근거를 함께 설명할 것)

작성 필수 조건:
- 계약 가능성, 클로징 가능성을 절대 확정적으로 표현하지 말 것 ("반드시 계약합니다", "곧 가입할 것입니다", "100% 성사" 등 금지)
- 클로징 가능성 평가는 어디까지나 참고 지표이며 실제 결과를 보장하지 않는다는 점을 명시할 것
- "무조건", "확정", "보장됩니다" 등 단정적 표현 금지
- 고객 불안을 과도하게 자극하는 표현 금지
- 실제 설계사가 자연스럽게 활용할 수 있는 현실적인 톤으로 작성
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것`,
  },
}

export async function getActivePrompt(feature: AIFeature): Promise<ResolvedPrompt> {
  try {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('prompt_versions')
      .select('system_prompt, user_prompt_template, version')
      .eq('feature_type', FEATURE_TYPE_MAP[feature])
      .eq('is_active', true)
      .maybeSingle()

    if (data?.user_prompt_template) {
      const template = data.system_prompt
        ? `${data.system_prompt}\n\n${data.user_prompt_template}`
        : data.user_prompt_template
      return { template, version: data.version }
    }
  } catch { /* fallback below */ }

  return FALLBACK_PROMPTS[feature]
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  )
}
