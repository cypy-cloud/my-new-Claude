import type { PlanId } from '@/lib/subscription/plans'
import { changePlan } from './subscription-service'
import type { BillingProvider } from './provider'

export interface UpdateSubscriptionParams {
  userId: string
  fromPlan: PlanId
  toPlan: PlanId
  provider: BillingProvider
  transactionId?: string
  amount?: number
}

export async function updateSubscription(params: UpdateSubscriptionParams): Promise<{ immediate: boolean; effectiveDate: string | null }> {
  return changePlan(params)
}
