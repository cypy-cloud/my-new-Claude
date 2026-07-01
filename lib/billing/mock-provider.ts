import type { BillingProviderAdapter, CheckoutSession, PaymentResult } from './billing-provider'
import type { PlanId } from '@/lib/subscription/plans'

// 실제 결제 없이 즉시 성공하는 개발/테스트용 어댑터
export class MockProvider implements BillingProviderAdapter {
  readonly provider = 'mock' as const

  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
    cancelUrl?: string
  }): Promise<CheckoutSession> {
    const sessionId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    // mock: returnUrl에 세션 ID와 플랜을 붙여서 바로 리다이렉트
    const checkoutUrl = `${params.returnUrl}?session_id=${sessionId}&plan=${params.planId}&mock=1`
    return { sessionId, checkoutUrl, provider: 'mock', planId: params.planId, amount: params.amount }
  }

  async verifyPayment(params: { sessionId: string }): Promise<PaymentResult> {
    if (params.sessionId.startsWith('mock_')) {
      return {
        success: true,
        provider: 'mock',
        transactionId: params.sessionId,
        customerId: `mock_cus_${params.sessionId.slice(5, 13)}`,
        subscriptionId: `mock_sub_${params.sessionId.slice(5, 13)}`,
      }
    }
    return { success: false, provider: 'mock', error: 'Invalid mock session' }
  }

  async cancelSubscription(_params: { providerSubscriptionId: string }): Promise<PaymentResult> {
    return { success: true, provider: 'mock', transactionId: `mock_cancel_${Date.now()}` }
  }

  verifyWebhookSignature(_body: string, _signature: string): boolean {
    return true // mock은 서명 검증 없음
  }
}
