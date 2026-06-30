import { createClient } from '@/lib/supabase/server'
import type { PlanId } from '@/lib/subscription/plans'
import { PLANS } from '@/lib/subscription/plans'
import type { BillingProvider } from './provider'

export interface UpdateSubscriptionParams {
  userId: string
  fromPlan: PlanId
  toPlan: PlanId
  provider: BillingProvider
  transactionId?: string
  amount?: number
}

export async function updateSubscription(params: UpdateSubscriptionParams): Promise<void> {
  const { userId, fromPlan, toPlan, provider, transactionId, amount } = params
  const supabase = await createClient()

  const eventType = getPlanRank(toPlan) > getPlanRank(fromPlan) ? 'upgrade' : 'downgrade'

  // 1. 구독 이벤트 기록
  await (supabase as any).from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    from_plan: fromPlan,
    to_plan: toPlan,
    amount: amount ?? PLANS[toPlan].price,
    provider,
    provider_tx_id: transactionId ?? null,
    status: 'completed',
    metadata: { updated_at: new Date().toISOString() },
  })

  // 2. profiles.plan_type 업데이트
  await (supabase as any).from('profiles').update({ plan_type: toPlan }).eq('id', userId)
}

function getPlanRank(planId: PlanId): number {
  const ranks: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, premium: 3 }
  return ranks[planId] ?? 0
}
