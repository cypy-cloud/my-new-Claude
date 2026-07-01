import { NextRequest, NextResponse } from 'next/server'
import { getBillingAdapter } from '@/lib/billing/billing-provider'
import { handleWebhookEvent } from '@/lib/billing/payment-webhook'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const provider = request.nextUrl.searchParams.get('provider') as 'toss' | 'stripe' | null

  if (!provider || (provider !== 'toss' && provider !== 'stripe')) {
    return NextResponse.json({ error: 'provider=toss|stripe 필수' }, { status: 400 })
  }

  // provider별 어댑터로 서명 검증
  const adapter = await getBillingAdapter()
  const signature = request.headers.get('toss-signature') ?? request.headers.get('stripe-signature') ?? ''

  if (signature && !adapter.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await handleWebhookEvent({
    provider,
    eventType: ((data.eventType ?? data.type) as string) ?? '',
    rawBody,
    signature,
    data,
  })

  if (!result.handled) {
    // 처리하지 않은 이벤트도 200 반환 (provider 재전송 방지)
    return NextResponse.json({ ok: true, skipped: true, reason: result.action ?? result.error })
  }

  return NextResponse.json({ ok: true, action: result.action })
}
