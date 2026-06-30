import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSubscription } from '@/lib/billing/update-subscription'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { PlanId } from '@/lib/subscription/plans'

const VALID_PLANS: PlanId[] = ['free', 'basic', 'pro', 'premium']

export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = await createClient()
  const body = await request.json()
  const { targetUserId, planId } = body as { targetUserId?: string; planId: PlanId }

  if (!VALID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '유효하지 않은 요금제입니다' }, { status: 400 })
  }

  const userId = targetUserId ?? guard.ctx.userId

  // 대상 사용자의 현재 플랜 확인
  const { data: targetProfile } = await (supabase as any)
    .from('profiles').select('plan_type').eq('id', userId).single()
  const fromPlan = (targetProfile?.plan_type as PlanId) ?? 'free'

  await updateSubscription({
    userId,
    fromPlan,
    toPlan: planId,
    provider: 'mock',
    transactionId: `admin_${guard.ctx.userId}_${Date.now()}`,
    amount: 0,
  })

  return NextResponse.json({ ok: true, planId, changedBy: guard.ctx.userId })
}
