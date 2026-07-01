import type { BillingProvider } from './billing-provider'
import {
  activateSubscription,
  markPastDue,
  expireSubscription,
  cancelSubscription,
  recordPayment,
} from './subscription-service'
import type { PlanId } from '@/lib/subscription/plans'

export interface WebhookEvent {
  provider: BillingProvider
  eventType: string
  rawBody: string
  signature: string
  data: Record<string, unknown>
}

export interface WebhookResult {
  handled: boolean
  action?: string
  error?: string
}

// 공급자별 웹훅 이벤트를 처리하는 진입점
export async function handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult> {
  try {
    if (event.provider === 'toss') return await handleTossEvent(event)
    if (event.provider === 'stripe') return await handleStripeEvent(event)
    return { handled: false, error: `지원하지 않는 provider: ${event.provider}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { handled: false, error: message }
  }
}

// ── Toss Payments 웹훅 ────────────────────────────────────────────────────
// 참고: https://docs.tosspayments.com/reference/webhooks
async function handleTossEvent(event: WebhookEvent): Promise<WebhookResult> {
  const d = event.data

  switch (event.eventType) {
    case 'PAYMENT_STATUS_CHANGED': {
      // placeholder: 실제 Toss 웹훅 페이로드 필드 맞춰 구현
      const { userId, planId, amount, paymentKey, status } = d as {
        userId: string; planId: PlanId; amount: number; paymentKey: string; status: string
      }

      if (status === 'DONE') {
        const sub = await activateSubscription({ userId, planType: planId, provider: 'toss', providerSubscriptionId: paymentKey })
        await recordPayment({
          userId, subscriptionId: sub.id, amount, provider: 'toss',
          providerTxId: paymentKey, status: 'succeeded', paidAt: new Date(),
        })
        return { handled: true, action: 'activated' }
      }

      if (status === 'CANCELED' || status === 'ABORTED') {
        await recordPayment({ userId, amount, provider: 'toss', providerTxId: paymentKey, status: 'canceled' })
        return { handled: true, action: 'payment_canceled' }
      }

      return { handled: false, action: `unknown toss status: ${status}` }
    }

    case 'BILLING_AUTH_STATUS_CHANGED': {
      // 빌링키 상태 변경 — placeholder
      return { handled: true, action: 'billing_auth_status_changed (placeholder)' }
    }

    default:
      return { handled: false, action: `unhandled toss event: ${event.eventType}` }
  }
}

// ── Stripe 웹훅 ────────────────────────────────────────────────────────────
// 참고: https://stripe.com/docs/api/events/types
async function handleStripeEvent(event: WebhookEvent): Promise<WebhookResult> {
  const d = event.data as any

  switch (event.eventType) {
    case 'checkout.session.completed': {
      // 결제 성공 → 구독 활성화
      const userId: string = d.metadata?.userId
      const planId: PlanId = d.metadata?.planId
      const amount: number = Math.round((d.amount_total ?? 0) / 1)
      const customerId: string = d.customer
      const subscriptionId: string = d.subscription

      if (!userId || !planId) return { handled: false, error: 'metadata.userId 또는 planId 없음' }

      const sub = await activateSubscription({
        userId, planType: planId, provider: 'stripe',
        providerCustomerId: customerId, providerSubscriptionId: subscriptionId,
      })
      await recordPayment({
        userId, subscriptionId: sub.id, amount, provider: 'stripe',
        providerTxId: d.payment_intent, status: 'succeeded', paidAt: new Date(),
      })
      return { handled: true, action: 'activated' }
    }

    case 'invoice.payment_succeeded': {
      // 정기 갱신 성공
      const customerId: string = d.customer
      const amount: number = Math.round((d.amount_paid ?? 0) / 1)

      // TODO: customerId → userId 조회 후 처리
      void customerId; void amount
      return { handled: true, action: 'renewal_succeeded (placeholder)' }
    }

    case 'invoice.payment_failed': {
      // 결제 실패 → past_due 처리
      const userId: string | undefined = d.metadata?.userId
      if (userId) {
        await markPastDue(userId)
        await recordPayment({
          userId, amount: d.amount_due ?? 0, provider: 'stripe',
          providerTxId: d.id, status: 'failed',
        })
      }
      return { handled: true, action: 'past_due' }
    }

    case 'customer.subscription.deleted': {
      // 구독 즉시 해지
      const userId: string | undefined = d.metadata?.userId
      if (userId) await expireSubscription(userId)
      return { handled: true, action: 'expired' }
    }

    case 'customer.subscription.updated': {
      // 취소 예약 변경 등 — placeholder
      void d
      return { handled: true, action: 'subscription_updated (placeholder)' }
    }

    default:
      return { handled: false, action: `unhandled stripe event: ${event.eventType}` }
  }
}

// ── 구독 취소 요청 (UI에서 직접 호출) ──────────────────────────────────────

export async function requestCancellation(params: {
  userId: string
  providerSubscriptionId?: string
  immediately?: boolean
}): Promise<WebhookResult> {
  try {
    if (params.providerSubscriptionId) {
      const { getBillingAdapter } = await import('./billing-provider')
      const adapter = await getBillingAdapter()
      const result = await adapter.cancelSubscription({
        providerSubscriptionId: params.providerSubscriptionId,
        immediately: params.immediately,
      })
      if (!result.success) return { handled: false, error: result.error }
    }

    await cancelSubscription({ userId: params.userId, immediately: params.immediately })
    return { handled: true, action: params.immediately ? 'canceled_immediately' : 'cancel_scheduled' }
  } catch (err) {
    return { handled: false, error: err instanceof Error ? err.message : String(err) }
  }
}
