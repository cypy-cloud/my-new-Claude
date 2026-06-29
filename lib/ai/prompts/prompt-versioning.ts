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
    version: 'v1.0.0-fallback',
    template:
      '당신은 보험설계사를 위한 상담 스크립트 전문가입니다.\n\n고객 상황:\n- 상품 유형: {{product_type}}\n- 고객 연령대: {{age_group}}\n- 상담 목적: {{purpose}}\n- 고객 우려사항: {{concerns}}\n\n위 정보를 바탕으로 자연스러운 상담 스크립트를 작성해주세요.',
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
