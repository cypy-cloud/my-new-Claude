import type { ProviderAdapter, CheckoutSession, BillingResult } from './provider'
import type { PlanId } from '@/lib/subscription/plans'

// Stripe 연동 — 실제 구현은 STRIPE_SECRET_KEY 환경변수 설정 후 활성화
// 공식 문서: https://stripe.com/docs/api
export class StripeAdapter implements ProviderAdapter {
  private readonly secretKey = process.env.STRIPE_SECRET_KEY ?? ''

  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
  }): Promise<CheckoutSession> {
    // TODO: stripe.checkout.sessions.create()
    // 가격 ID는 Stripe Dashboard에서 생성 후 환경변수로 관리
    // STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM
    void this.secretKey
    const sessionId = `cs_placeholder_${params.planId}`
    return {
      sessionId,
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      provider: 'stripe',
      planId: params.planId,
      amount: params.amount,
    }
  }

  async verifyPayment(params: { sessionId: string }): Promise<BillingResult> {
    // TODO: stripe.checkout.sessions.retrieve(params.sessionId)
    // payment_status === 'paid' 확인 후 성공 반환
    return { success: false, provider: 'stripe', error: `Not yet implemented: ${params.sessionId}` }
  }

  async cancelSubscription(_params: { userId: string; subscriptionId: string }): Promise<BillingResult> {
    // TODO: stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    return { success: false, provider: 'stripe', error: 'Not yet implemented' }
  }
}
