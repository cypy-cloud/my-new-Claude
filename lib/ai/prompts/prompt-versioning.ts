import { createClient } from '@/lib/supabase/server'
import type { AIFeature } from '../types'

export interface ResolvedPrompt {
  template: string
  version: string
}

const FALLBACK_PROMPTS: Record<AIFeature, ResolvedPrompt> = {
  ai_message: {
    version: 'v2.0.0-fallback',
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
- 추가 참고 내용: {{extra_notes}}

아래 5가지 버전의 메시지를 작성해주세요.
각 버전은 반드시 정확히 아래 마커로 구분하세요:

[SMS]
(문자용 메시지 - 90자 이내, 간결하고 핵심만)

[KAKAO]
(카카오톡용 메시지 - 이모지 1~2개 포함, 친근하고 자연스럽게)

[SOFT]
(부드러운 버전 - 압박감 없이 배려하는 톤)

[PERSUASIVE]
(설득력 있는 버전 - 혜택 중심, 행동 유도)

[FOLLOWUP]
(후속 연락용 짧은 메시지 - 30자 이내, 안부 형식)

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
    version: 'v1.0.0-fallback',
    template:
      '당신은 보험 상품 설명 전문가입니다.\n\nPDF 내용:\n{{pdf_content}}\n\n다음 형식으로 작성해주세요:\n1. 핵심 보장 내용 요약\n2. 주요 혜택\n3. 보험료 및 납입 조건\n4. 주의사항\n5. 고객 설명용 예시 문구',
  },
}

export async function getActivePrompt(feature: AIFeature): Promise<ResolvedPrompt> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('prompt_versions')
      .select('prompt_template, version')
      .eq('feature', feature)
      .eq('is_active', true)
      .maybeSingle()

    if (data?.prompt_template) {
      return { template: data.prompt_template, version: data.version }
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
