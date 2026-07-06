import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PortOneProvider } from '@/lib/billing/portone-provider'

// 클라이언트 SDK(requestIssueBillingKey)가 발급받은 billingKey를 서버에서 검증한 뒤 profiles에 저장한다.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { billingKey } = body as { billingKey?: string }

  if (!billingKey) {
    return NextResponse.json({ error: 'billingKey 필수' }, { status: 400 })
  }

  const provider = new PortOneProvider()
  const result = await provider.verifyBillingKey(billingKey)

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? '카드 등록에 실패했습니다' }, { status: 400 })
  }

  // customerId는 이 유저 소유의 것인지 확인 (다른 유저의 카드가 잘못 연결되는 것 방지)
  const expectedCustomerId = `fp_${user.id.replace(/-/g, '').slice(0, 20)}`
  if (result.customerId !== expectedCustomerId) {
    return NextResponse.json({ error: '유효하지 않은 요청입니다' }, { status: 400 })
  }

  await (supabase as any)
    .from('profiles')
    .update({
      portone_billing_key: result.billingKey,
      portone_customer_id: result.customerId,
      billing_card_last4: result.cardLast4 ?? null,
      billing_card_brand: result.cardBrand ?? null,
      billing_key_registered_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true, cardLast4: result.cardLast4, cardBrand: result.cardBrand })
}

// 카드 등록 해제 (다음 자동 결제부터는 수동 결제로 전환됨)
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('portone_billing_key')
    .eq('id', user.id)
    .single()

  if (profile?.portone_billing_key) {
    const provider = new PortOneProvider()
    await provider.deleteBillingKey(profile.portone_billing_key)
  }

  await (supabase as any)
    .from('profiles')
    .update({
      portone_billing_key: null,
      portone_customer_id: null,
      billing_card_last4: null,
      billing_card_brand: null,
      billing_key_registered_at: null,
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
