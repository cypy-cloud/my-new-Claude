import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { messageType, customerName, situation, style, forceRegenerate = false } = body

  if (!messageType || !situation) {
    return NextResponse.json({ error: '메시지 유형과 상황을 입력해주세요' }, { status: 400 })
  }

  // Check usage limit (skip for cached responses — checked after generation)
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

  // Resolve prompt template
  const { template, version } = await getActivePrompt('ai_message')
  const prompt = renderPrompt(template, {
    message_type: messageType,
    customer_name: customerName || '고객',
    situation,
    style: style || '친근체',
  })

  const cacheInput = { messageType, customerName: customerName || '', situation, style }

  let result
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_message',
      userId: user.id,
      maxTokens: 600,
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

  // Only increment usage on fresh generation (not cache hits)
  const wasCached = !!result.cachedAt
  if (!wasCached) {
    await incrementUsage(user.id, 'sms', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'sms')

  return NextResponse.json({
    text: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
  })
}
