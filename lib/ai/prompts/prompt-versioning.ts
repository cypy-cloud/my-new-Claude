import { createClient } from '@/lib/supabase/server'
import type { AIFeature } from '../types'

export interface ResolvedPrompt {
  template: string
  version: string
}

const FALLBACK_PROMPTS: Record<AIFeature, ResolvedPrompt> = {
  ai_message: {
    version: 'v1.0.0-fallback',
    template:
      '당신은 보험설계사를 돕는 AI 어시스턴트입니다. 고객에게 보낼 {{message_type}} 메시지를 작성해주세요.\n\n고객 정보:\n- 이름: {{customer_name}}\n- 상황: {{situation}}\n\n메시지 스타일: {{style}}\n\n자연스럽고 친근한 톤으로 작성해주세요.',
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
