import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'

const DISCLAIMER = '\n\n[보험 관련 유의사항] 이 스크립트는 AI가 생성한 참고용 자료입니다. 실제 상담 시 고객 상황에 맞게 조정하시기 바랍니다. 보험 상품의 보장 내용 및 보험료는 계약 조건에 따라 달라질 수 있으며, 가입 전 반드시 약관을 확인하시기 바랍니다.'

const SECTION_MARKERS = ['PREP', 'GREETING', 'ICEBREAK', 'NEEDS', 'AWARENESS', 'PRODUCT', 'PERSONA', 'OBJECTION', 'CLOSING', 'FOLLOWUP']

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
    forceRegenerate = false,
  } = body

  if (!productInterest || !consultationPurpose) {
    return NextResponse.json({ error: '관심 상품과 상담 목적을 입력해주세요' }, { status: 400 })
  }

  try {
    await blockIfLimitExceeded(user.id, 'script')
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const category = await resolveProductCategory(categoryId)

  const { template, version } = await getActivePrompt('ai_script')
  let prompt = renderPrompt(template, {
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
  })
  const categoryAddendum = buildProductCategoryAddendum(category)
  if (categoryAddendum) prompt = `${prompt}\n\n${categoryAddendum}`
  const fullDisclaimer = category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER

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
      maxTokens: 2500,
      temperature: 0.7,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
    })
    sections = parseOutputSections(result.text, fullDisclaimer)

    // Stale cache from before a prompt/format change may not contain valid markers — bypass it once
    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_script',
        userId: user.id,
        maxTokens: 2500,
        temperature: 0.7,
        cacheInput,
        promptVersion: version,
        forceRegenerate: true,
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
    await incrementUsage(user.id, 'script', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
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
