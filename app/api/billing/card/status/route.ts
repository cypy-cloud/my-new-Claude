import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 자동결제 카드 등록 여부 조회 (원클릭 결제 가능 여부 판단용)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('toss_billing_key, billing_card_last4, billing_card_brand')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    hasBillingKey: !!profile?.toss_billing_key,
    cardLast4: profile?.billing_card_last4 ?? null,
    cardBrand: profile?.billing_card_brand ?? null,
  })
}
