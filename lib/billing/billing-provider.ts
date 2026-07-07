import type { PlanId } from '@/lib/subscription/plans'

export type BillingProvider = 'mock' | 'portone' | 'stripe'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'canceled'

export interface CheckoutSession {
  sessionId: string
  checkoutUrl: string
  provider: BillingProvider
  planId: PlanId
  amount: number
  interval: 'month' | 'year'
}

export interface PaymentResult {
  success: boolean
  provider: BillingProvider
  transactionId?: string
  customerId?: string
  subscriptionId?: string
  error?: string
}

export interface SubscriptionSyncResult {
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  planType: PlanId
}

// 결제 공급자가 구현해야 할 인터페이스
export interface BillingProviderAdapter {
  readonly provider: BillingProvider

  // 결제 세션 생성 (결제 페이지 URL 반환)
  createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    interval: 'month' | 'year'
    returnUrl: string
    cancelUrl?: string
  }): Promise<CheckoutSession>

  // 결제 검증 (결제 완료 콜백 후 호출)
  verifyPayment(params: {
    sessionId: string
    paymentKey?: string
    orderId?: string
    amount?: number
  }): Promise<PaymentResult>

  // 구독 취소 (다음 갱신일 이후 해지 또는 즉시 해지)
  cancelSubscription(params: {
    providerSubscriptionId: string
    immediately?: boolean
  }): Promise<PaymentResult>

  // 웹훅 서명 검증
  verifyWebhookSignature(body: string, signature: string): boolean
}

export function getActiveProvider(): BillingProvider {
  if (process.env.PORTONE_API_SECRET) return 'portone'
  if (process.env.STRIPE_SECRET_KEY) return 'stripe'
  return 'mock'
}

export async function getBillingAdapter(): Promise<BillingProviderAdapter> {
  const provider = getActiveProvider()
  switch (provider) {
    case 'portone': {
      const { PortOneProvider } = await import('./portone-provider')
      return new PortOneProvider()
    }
    case 'stripe': {
      const { StripeProvider } = await import('./stripe-provider')
      return new StripeProvider()
    }
    default: {
      const { MockProvider } = await import('./mock-provider')
      return new MockProvider()
    }
  }
}
