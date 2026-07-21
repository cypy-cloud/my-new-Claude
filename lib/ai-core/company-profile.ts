import { createClient } from '@/lib/supabase/server'
import type { AiCoreFeature } from './types'

export interface CompanyPromptContext {
  companyName: string | null
  toneGuide: string | null
  complianceGuide: string | null
  forbiddenExpressions: string[]
  preferredExpressions: string[]
  disclaimerTemplate: string | null
}

export const EMPTY_CONTEXT: CompanyPromptContext = {
  companyName: null,
  toneGuide: null,
  complianceGuide: null,
  forbiddenExpressions: [],
  preferredExpressions: [],
  disclaimerTemplate: null,
}

// Looks up the user's insurance company (free-text profiles.company — 설정 페이지의
// "회사" 필드), then the matching active company_prompt_profiles row for this feature.
// Falls back to EMPTY_CONTEXT (base prompt only) when no match is found.
// (2026-07-21 수정: profiles.insurance_company은 실제로 존재한 적 없는 컬럼이라
// 이 조회가 항상 조용히 실패해서 보험사별 프롬프트 커스터마이징 기능이 한 번도
// 동작한 적이 없었음 — 실제 저장/수정되는 컬럼인 profiles.company로 교체)
export async function resolveCompanyContext(
  userId: string | undefined,
  feature: AiCoreFeature
): Promise<CompanyPromptContext> {
  if (!userId) return EMPTY_CONTEXT

  try {
    const supabase = await createClient()
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('company')
      .eq('id', userId)
      .maybeSingle()

    const companyName = (profile?.company as string | undefined)?.trim()
    if (!companyName) return EMPTY_CONTEXT

    const { data: company } = await db
      .from('insurance_companies')
      .select('id, name')
      .eq('name', companyName)
      .eq('is_active', true)
      .maybeSingle()

    if (!company) return EMPTY_CONTEXT

    const { data: profileRow } = await db
      .from('company_prompt_profiles')
      .select('tone_guide, compliance_guide, forbidden_expressions, preferred_expressions, disclaimer_template')
      .eq('company_id', company.id)
      .eq('feature_type', feature)
      .eq('is_active', true)
      .maybeSingle()

    if (!profileRow) {
      return { ...EMPTY_CONTEXT, companyName: company.name }
    }

    return {
      companyName: company.name,
      toneGuide: profileRow.tone_guide ?? null,
      complianceGuide: profileRow.compliance_guide ?? null,
      forbiddenExpressions: profileRow.forbidden_expressions ?? [],
      preferredExpressions: profileRow.preferred_expressions ?? [],
      disclaimerTemplate: profileRow.disclaimer_template ?? null,
    }
  } catch {
    return EMPTY_CONTEXT
  }
}

// Universal guardrail appended to every prompt regardless of company match —
// prevents the model from inventing product names/coverage not present in
// user-supplied source material (signup form has no enforced company list).
const ANTI_HALLUCINATION_GUARDRAIL = `[중요 — 사실 기반 작성 원칙]
- 실제 보험 상품명, 보장 내용, 보험료, 가입 조건은 위에 주어진 입력 자료(업로드 자료, 사용자가 입력한 내용)에 명시된 것만 사용하세요.
- 입력 자료에 없는 보장 내용, 상품명, 수치를 임의로 만들어내지 마세요.
- 입력 자료에 없는 내용은 "제공된 자료에 명시되어 있지 않습니다" 또는 이와 유사하게 안내하고, 추측하거나 단정적으로 서술하지 마세요.`

export function buildCompanyPromptAddendum(ctx: CompanyPromptContext): string {
  const parts: string[] = [ANTI_HALLUCINATION_GUARDRAIL]

  if (ctx.companyName) {
    const companyParts: string[] = [`[${ctx.companyName} 맞춤 작성 가이드]`]
    if (ctx.toneGuide) companyParts.push(`- 말투/톤: ${ctx.toneGuide}`)
    if (ctx.complianceGuide) companyParts.push(`- 컴플라이언스 유의사항: ${ctx.complianceGuide}`)
    if (ctx.preferredExpressions.length > 0) {
      companyParts.push(`- 가급적 다음 표현을 활용하세요: ${ctx.preferredExpressions.join(', ')}`)
    }
    if (ctx.forbiddenExpressions.length > 0) {
      companyParts.push(`- 다음 표현은 절대 사용하지 마세요: ${ctx.forbiddenExpressions.join(', ')}`)
    }
    if (companyParts.length > 1) parts.push(companyParts.join('\n'))
  }

  return parts.join('\n\n')
}

const DEFAULT_DISCLAIMER =
  '본 안내는 일반적인 참고 정보이며, 정확한 보장 내용과 약관은 반드시 해당 보험사의 공식 상품설명서 및 약관을 통해 확인하시기 바랍니다.'

export function resolveDisclaimer(ctx: CompanyPromptContext): string {
  return ctx.disclaimerTemplate?.trim() || DEFAULT_DISCLAIMER
}
