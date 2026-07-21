import { NextRequest, NextResponse } from 'next/server'
import { getBillingAdapter } from '@/lib/billing/billing-provider'
import { handleWebhookEvent } from '@/lib/billing/payment-webhook'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const provider = request.nextUrl.searchParams.get('provider') as 'portone' | 'stripe' | null

  if (!provider || (provider !== 'portone' && provider !== 'stripe')) {
    return NextResponse.json({ error: 'provider=portone|stripe 필수' }, { status: 400 })
  }

  // provider별 어댑터로 서명 검증
  const adapter = await getBillingAdapter()
  let signature = ''
  if (provider === 'portone') {
    // 포트원 웹훅(Svix 기반)은 3개 헤더가 필요해 "id.timestamp.signature" 형식으로 조합한다.
    const id = request.headers.get('webhook-id') ?? ''
    const timestamp = request.headers.get('webhook-timestamp') ?? ''
    const sig = request.headers.get('webhook-signature') ?? ''
    signature = id && timestamp && sig ? `${id}.${timestamp}.${sig}` : ''
  } else {
    signature = request.headers.get('stripe-signature') ?? ''
  }

  // 서명이 아예 없는 요청도 반드시 거부한다(fail-closed) — signature가 빈 문자열이면
  // 검증 자체를 건너뛰던 예전 로직은 서명 헤더 없이 위조된 요청도 통과시키는 구멍이었음.
  if (!adapter.verifyWebhookSignature(rawBody, signature)) {
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
