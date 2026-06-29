import type { ProviderAdapter, CheckoutSession, BillingResult } from './provider'
import type { PlanId } from '@/lib/subscription/plans'

// 실제 결제 없이 즉시 성공하는 테스트용 어댑터
export class MockBillingAdapter implements ProviderAdapter {
  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
  }): Promise<CheckoutSession> {
    const sessionId = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`
    // mock: returnUrl에 바로 리다이렉트 (실제 결제 페이지 없음)
    const checkoutUrl = `${params.returnUrl}?session_id=${sessionId}&plan=${params.planId}&mock=1`
    return {
      sessionId,
      checkoutUrl,
      provider: 'mock',
      planId: params.planId,
      amount: params.amount,
    }
  }

  async verifyPayment(params: { sessionId: string }): Promise<BillingResult> {
    // mock: sessionId가 mock_ 로 시작하면 항상 성공
    if (params.sessionId.startsWith('mock_')) {
      return {
        success: true,
        provider: 'mock',
        transactionId: params.sessionId,
      }
    }
    return { success: false, provider: 'mock', error: 'Invalid mock session' }
  }

  async cancelSubscription(_params: {
    userId: string
    subscriptionId: string
  }): Promise<BillingResult> {
    return { success: true, provider: 'mock', transactionId: 'mock_cancel' }
  }
}
