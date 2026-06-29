import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'

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

  const { template, version } = await getActivePrompt('ai_message')
  const prompt = renderPrompt(template, {
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

  const cacheInput = { customerName: customerName || '', ageGroup, occupation, relationship, purpose, productField, tone, length, extraNotes }

  let result
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_message',
      userId: user.id,
      maxTokens: 1200,
      temperature: 0.75,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
    })
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다. 다시 시도해주세요.' }, { status: 500 })
  }

  const wasCached = !!result.cachedAt
  const sections = parseOutputSections(result.text)

  // Add disclaimer to each section
  const withDisclaimer: Record<string, string> = {}
  for (const [k, v] of Object.entries(sections)) {
    withDisclaimer[k] = v + DISCLAIMER
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
