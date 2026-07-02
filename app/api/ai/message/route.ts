import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { notifyUsageLimitWarning } from '@/lib/notifications/create-notification'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'

const DISCLAIMER = '\n\n[보험 관련 유의사항] 이 메시지는 보험 상품에 대한 일반적인 안내 목적으로 작성되었습니다. 보험 상품 가입 전 약관을 반드시 확인하시기 바랍니다. 보험료 및 보장 내용은 계약 조건에 따라 달라질 수 있습니다.'

function parseOutputSections(raw: string): Record<string, string> {
  const markers = ['SMS', 'KAKAO', 'SOFT', 'PERSUASIVE', 'FOLLOWUP']
  const result: Record<string, string> = {}

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const nextMarker = markers[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue

    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim()
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
    ageGroup,
    occupation,
    relationship,
    purpose,
    productField,
    categoryId,
    tone,
    length,
    extraNotes,
    forceRegenerate = false,
  } = body

  if (!purpose || !productField) {
    return NextResponse.json({ error: '목적과 상품 분야를 입력해주세요' }, { status: 400 })
  }

  try {
    await blockIfLimitExceeded(user.id, 'sms')
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

  const { template, version } = await getActivePrompt('ai_message')
  let prompt = renderPrompt(template, {
    customer_name: customerName || '고객',
    age_group: ageGroup || '정보 없음',
    occupation: occupation || '정보 없음',
    relationship: relationship || '정보 없음',
    purpose,
    product_field: productField,
    tone: tone || '친근체',
    length: length || '보통',
    extra_notes: extraNotes || '없음',
  })
  const categoryAddendum = buildProductCategoryAddendum(category)
  if (categoryAddendum) prompt = `${prompt}\n\n${categoryAddendum}`

  const cacheInput = { customerName: customerName || '', ageGroup, occupation, relationship, purpose, productField, categoryId: category?.id ?? null, tone, length, extraNotes }

  let result
  let sections: Record<string, string>
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_message',
      userId: user.id,
      maxTokens: 3500,
      temperature: 0.75,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
    })
    sections = parseOutputSections(result.text)

    // Stale cache from before a prompt/format change may not contain valid markers — bypass it once
    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_message',
        userId: user.id,
        maxTokens: 3500,
        temperature: 0.75,
        cacheInput,
        promptVersion: version,
        forceRegenerate: true,
      })
      sections = parseOutputSections(result.text)
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_message', purpose, productField } })
  }

  const wasCached = !!result.cachedAt

  // Add disclaimer (+ category risk notice, if any) to each section
  const fullDisclaimer = category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER
  const withDisclaimer: Record<string, string> = {}
  for (const [k, v] of Object.entries(sections)) {
    withDisclaimer[k] = v + fullDisclaimer
  }

  if (!wasCached) {
    await incrementUsage(user.id, 'sms', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    })
    await trackFeatureComplete('ai_message', user.id, {
      productField,
      purpose,
      cached: false,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'sms')

  // 사용량 80% 이상이면 알림 발송 (비동기, 오류 무시)
  if (afterCheck.limit > 0 && afterCheck.used / afterCheck.limit >= 0.8) {
    notifyUsageLimitWarning(user.id, 'AI 문자', afterCheck.used, afterCheck.limit).catch(() => {})
  }

  return NextResponse.json({
    sections: withDisclaimer,
    rawText: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
    promptVersion: version,
  })
}
