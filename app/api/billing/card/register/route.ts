import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TossProvider } from '@/lib/billing/toss-provider'

// 카드 등록(빌링키 발급) 인증 성공 후, 클라이언트가 authKey/customerKey를 넘겨주면
// 이를 실제 billingKey로 교환해 profiles에 저장한다.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { authKey, customerKey } = body as { authKey?: string; customerKey?: string }

  if (!authKey || !customerKey) {
    return NextResponse.json({ error: 'authKey, customerKey 필수' }, { status: 400 })
  }

  // customerKey는 이 유저 소유의 것인지 확인 (다른 유저의 카드가 잘못 연결되는 것 방지)
  const expectedCustomerKey = `fp_${user.id.replace(/-/g, '').slice(0, 20)}`
  if (customerKey !== expectedCustomerKey) {
    return NextResponse.json({ error: '유효하지 않은 요청입니다' }, { status: 400 })
  }

  const provider = new TossProvider()
  const result = await provider.issueBillingKey(authKey, customerKey)

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? '카드 등록에 실패했습니다' }, { status: 400 })
  }

  await (supabase as any)
    .from('profiles')
    .update({
      toss_billing_key: result.billingKey,
      toss_customer_key: customerKey,
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

  await (supabase as any)
    .from('profiles')
    .update({
      toss_billing_key: null,
      toss_customer_key: null,
      billing_card_last4: null,
      billing_card_brand: null,
      billing_key_registered_at: null,
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
