import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateDiscountCode } from '@/lib/billing/discount'
import { type PlanId } from '@/lib/subscription/plans'

// 체크아웃 화면에서 "적용" 버튼 클릭 시 호출 — 화면에 할인가를 보여주기 위한
// 용도일 뿐, 실제 결제 금액 확정은 /api/billing/verify에서 항상 다시 검증한다.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { code, planId } = await request.json() as { code?: string; planId?: PlanId }
  if (!code || !planId) {
    return NextResponse.json({ error: 'code, planId 필수' }, { status: 400 })
  }

  const result = await validateDiscountCode(code, planId, user.id)
  if (!result.valid) {
    return NextResponse.json({ error: result.error ?? '유효하지 않은 할인코드입니다' }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    discountPercent: result.discountPercent,
    discountedAmount: result.discountedAmount,
  })
}
