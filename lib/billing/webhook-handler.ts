import { createClient } from '@/lib/supabase/server'
import { updateSubscription } from './update-subscription'
import type { PlanId } from '@/lib/subscription/plans'

export interface WebhookPayload {
  provider: 'toss' | 'stripe'
  eventType: string
  data: Record<string, unknown>
}

export async function handleWebhook(payload: WebhookPayload): Promise<void> {
  const supabase = await createClient()

  if (payload.provider === 'toss') {
    await handleTossWebhook(supabase, payload)
  } else if (payload.provider === 'stripe') {
    await handleStripeWebhook(supabase, payload)
  }
}

async function handleTossWebhook(_supabase: any, payload: WebhookPayload): Promise<void> {
  // TODO: Toss 웹훅 이벤트 처리
  // 이벤트 종류: PAYMENT_STATUS_CHANGED, BILLING_AUTH_STATUS_CHANGED
  switch (payload.eventType) {
    case 'PAYMENT_STATUS_CHANGED': {
      const { userId, toPlan, fromPlan, amount, paymentKey } = payload.data as {
        userId: string; toPlan: PlanId; fromPlan: PlanId; amount: number; paymentKey: string
      }
      if (payload.data.status === 'DONE') {
        await updateSubscription({ userId, fromPlan, toPlan, provider: 'toss', transactionId: paymentKey, amount })
      }
      break
    }
    // 추가 이벤트 처리 가능
  }
}

async function handleStripeWebhook(_supabase: any, payload: WebhookPayload): Promise<void> {
  // TODO: Stripe 웹훅 이벤트 처리
  // 이벤트 종류: customer.subscription.updated, invoice.payment_succeeded, invoice.payment_failed
  switch (payload.eventType) {
    case 'invoice.payment_succeeded': {
      const { userId, toPlan, fromPlan, amount, id } = payload.data as {
        userId: string; toPlan: PlanId; fromPlan: PlanId; amount: number; id: string
      }
      await updateSubscription({ userId, fromPlan, toPlan, provider: 'stripe', transactionId: id, amount })
      break
    }
    case 'invoice.payment_failed': {
      // 결제 실패 이벤트 기록만
      break
    }
  }
}
