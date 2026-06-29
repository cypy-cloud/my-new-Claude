import { NextRequest, NextResponse } from 'next/server'
import { handleWebhook } from '@/lib/billing/webhook-handler'

// 웹훅 시크릿 검증 (provider별 구현)
function verifyTossSignature(_body: string, _signature: string): boolean {
  // TODO: Toss 웹훅 서명 검증
  // HMAC-SHA256(body, TOSS_WEBHOOK_SECRET)
  return true // placeholder
}

function verifyStripeSignature(_body: string, _signature: string): boolean {
  // TODO: stripe.webhooks.constructEvent() 사용
  return true // placeholder
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const provider = request.nextUrl.searchParams.get('provider') as 'toss' | 'stripe' | null

  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 })

  // 서명 검증
  const signature = request.headers.get('toss-signature') ?? request.headers.get('stripe-signature') ?? ''
  const valid = provider === 'toss'
    ? verifyTossSignature(rawBody, signature)
    : verifyStripeSignature(rawBody, signature)

  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await handleWebhook({
    provider,
    eventType: (payload.eventType ?? payload.type) as string,
    data: payload as Record<string, unknown>,
  })

  return NextResponse.json({ ok: true })
}
