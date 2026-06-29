import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { messageType, customerName, situation, style } = body

  if (!messageType || !situation) {
    return NextResponse.json({ error: '메시지 유형과 상황을 입력해주세요' }, { status: 400 })
  }

  // Check usage limit
  const yearMonth = new Date().toISOString().slice(0, 7)

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const planId = (subscription as { plan_id?: string } | null)?.plan_id ?? 'free'

  const { data: planData } = await supabase
    .from('plans')
    .select('ai_message_limit, name')
    .eq('id', planId)
    .single()

  const limit = (planData as { ai_message_limit?: number } | null)?.ai_message_limit ?? 5

  const { data: usage } = await supabase
    .from('monthly_usage')
    .select('ai_message_count')
    .eq('user_id', user.id)
    .eq('year_month', yearMonth)
    .single()

  const currentCount = (usage as { ai_message_count?: number } | null)?.ai_message_count ?? 0

  if (currentCount >= limit) {
    return NextResponse.json(
      { error: `이번 달 사용 한도(${limit}회)를 초과했습니다. 플랜을 업그레이드해주세요.`, limitExceeded: true },
      { status: 429 }
    )
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
      supabase.from('usage_logs').insert({
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
      supabase.rpc('increment_usage', { p_user_id: user.id, p_feature: 'ai_message' }),
    ])
    return NextResponse.json({ text: c.response_text, cached: true, remaining: limit - currentCount - 1 })
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
    await supabase.from('usage_logs').insert({
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
    supabase.from('ai_cache').upsert({
      cache_key: cacheKey,
      feature: 'ai_message',
      response_text: result.text,
      ai_provider: result.provider,
      ai_model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
    supabase.from('usage_logs').insert({
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
    supabase.rpc('increment_usage', { p_user_id: user.id, p_feature: 'ai_message' }),
  ])

  return NextResponse.json({ text: result.text, cached: false, remaining: limit - currentCount - 1 })
}
