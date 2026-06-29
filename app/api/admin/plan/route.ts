import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSubscription } from '@/lib/billing/update-subscription'
import type { PlanId } from '@/lib/subscription/plans'

const VALID_PLANS: PlanId[] = ['free', 'basic', 'pro', 'premium']

// 관리자 전용: 테스트 모드에서 사용자 플랜 강제 변경
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  // 관리자 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles').select('plan_type, is_admin').eq('user_id', user.id).single()

  const isAdmin = profile?.is_admin === true
  const isTestMode = process.env.NODE_ENV !== 'production'

  if (!isAdmin && !isTestMode) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json()
  const { targetUserId, planId } = body as { targetUserId?: string; planId: PlanId }

  const userId = targetUserId ?? user.id // 관리자가 다른 사용자 변경 가능

  if (!VALID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '유효하지 않은 요금제입니다' }, { status: 400 })
  }

  const fromPlan = (profile?.plan_type as PlanId) ?? 'free'

  await updateSubscription({
    userId,
    fromPlan,
    toPlan: planId,
    provider: 'mock',
    transactionId: `admin_${user.id}_${Date.now()}`,
    amount: 0,
  })

  return NextResponse.json({ ok: true, planId, changedBy: user.id })
}
