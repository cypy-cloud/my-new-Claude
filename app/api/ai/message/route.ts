import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { messageType, customerName, situation, style } = body

  if (!messageType || !situation) {
    return NextResponse.json({ error: '메시지 유형과 상황을 입력해주세요' }, { status: 400 })
  }

  // Check usage limit
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

  // Check AI cache
  const cacheInput = JSON.stringify({ messageType, customerName: customerName || '', situation, style })
  const cacheKey = createHash('sha256').update(cacheInput).digest('hex')

  const { data: cached } = await supabase
    .from('ai_cache')
    .select('response_text, ai_provider, ai_model, input_tokens, output_tokens')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached) {
    const c = cached as { response_text: string; ai_provider: string; ai_model: string; input_tokens: number; output_tokens: number }
    await Promise.all([
      db.from('usage_logs').insert({
        user_id: user.id,
        feature: 'ai_message',
        action: 'generate',
        ai_provider: c.ai_provider,
        ai_model: c.ai_model,
        input_tokens: c.input_tokens,
        output_tokens: c.output_tokens,
        response_cached: true,
        metadata: { messageType, style },
      }),
      incrementUsage(user.id, 'sms', { tokenInput: c.input_tokens, tokenOutput: c.output_tokens }),
    ])
    const afterCheck = await checkUsageLimit(user.id, 'sms')
    return NextResponse.json({ text: c.response_text, cached: true, remaining: afterCheck.remaining })
  }

  // Get active prompt template
  const { data: promptVersion } = await supabase
    .from('prompt_versions')
    .select('prompt_template')
    .eq('feature', 'ai_message')
    .eq('is_active', true)
    .maybeSingle()

  const template = (promptVersion as { prompt_template?: string } | null)?.prompt_template
    ?? '당신은 보험설계사를 돕는 AI 어시스턴트입니다. 고객에게 보낼 {{message_type}} 메시지를 작성해주세요.\n\n고객 정보:\n- 이름: {{customer_name}}\n- 상황: {{situation}}\n\n메시지 스타일: {{style}}\n\n자연스럽고 친근한 톤으로 작성해주세요.'

  const prompt = template
    .replace('{{message_type}}', messageType)
    .replace('{{customer_name}}', customerName || '고객')
    .replace('{{situation}}', situation)
    .replace('{{style}}', style || '친근체')

  const startTime = Date.now()
  const provider = getAIProvider()

  let result
  try {
    result = await provider.generateText(prompt, { maxTokens: 600, temperature: 0.75 })
  } catch (err) {
    await db.from('usage_logs').insert({
      user_id: user.id,
      feature: 'ai_message',
      action: 'generate_error',
      input_tokens: 0,
      output_tokens: 0,
      response_cached: false,
      metadata: { error: String(err) },
    })
    return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다. 다시 시도해주세요.' }, { status: 500 })
  }

  const duration = Date.now() - startTime

  await Promise.all([
    db.from('ai_cache').upsert({
      cache_key: cacheKey,
      feature: 'ai_message',
      response_text: result.text,
      ai_provider: result.provider,
      ai_model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
    db.from('usage_logs').insert({
      user_id: user.id,
      feature: 'ai_message',
      action: 'generate',
      ai_provider: result.provider,
      ai_model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      response_cached: false,
      duration_ms: duration,
      metadata: { messageType, style },
    }),
    incrementUsage(user.id, 'sms', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    }),
  ])

  const finalCheck = await checkUsageLimit(user.id, 'sms')
  return NextResponse.json({ text: result.text, cached: false, remaining: finalCheck.remaining })
}
