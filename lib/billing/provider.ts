import type { PlanId } from '@/lib/subscription/plans'

export type BillingProvider = 'mock' | 'toss' | 'stripe'

export interface CheckoutSession {
  sessionId: string
  checkoutUrl: string
  provider: BillingProvider
  planId: PlanId
  amount: number
}

export interface BillingResult {
  success: boolean
  provider: BillingProvider
  transactionId?: string
  error?: string
}

export interface ProviderAdapter {
  createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
  }): Promise<CheckoutSession>

  verifyPayment(params: {
    sessionId: string
    paymentKey?: string
    orderId?: string
    amount?: number
  }): Promise<BillingResult>

  cancelSubscription(params: {
    userId: string
    subscriptionId: string
  }): Promise<BillingResult>
}

export function getActiveProvider(): BillingProvider {
  if (process.env.TOSS_SECRET_KEY) return 'toss'
  if (process.env.STRIPE_SECRET_KEY) return 'stripe'
  return 'mock'
}

export async function getBillingAdapter(): Promise<ProviderAdapter> {
  const provider = getActiveProvider()
  switch (provider) {
    case 'toss': {
      const { TossAdapter } = await import('./toss')
      return new TossAdapter()
    }
    case 'stripe': {
      const { StripeAdapter } = await import('./stripe')
      return new StripeAdapter()
    }
    default: {
      const { MockBillingAdapter } = await import('./mock-billing')
      return new MockBillingAdapter()
    }
  }
}
