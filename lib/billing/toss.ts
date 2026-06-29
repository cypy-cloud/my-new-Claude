import type { ProviderAdapter, CheckoutSession, BillingResult } from './provider'
import type { PlanId } from '@/lib/subscription/plans'

// Toss Payments 연동 — 실제 구현은 TOSS_SECRET_KEY 환경변수 설정 후 활성화
// 공식 문서: https://docs.tosspayments.com/reference
export class TossAdapter implements ProviderAdapter {
  private readonly secretKey = process.env.TOSS_SECRET_KEY ?? ''
  private readonly clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ''
  private readonly baseUrl = 'https://api.tosspayments.com/v1'

  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
  }): Promise<CheckoutSession> {
    // TODO: Toss Payments 빌링키 발급 또는 일반결제 세션 생성
    // POST /v1/billing/authorizations/issue — 빌링키 발급
    // POST /v1/payments — 일반결제
    const orderId = `FP_${params.userId.slice(0, 8)}_${Date.now()}`
    const checkoutUrl = `https://pay.toss.im/...?orderId=${orderId}&amount=${params.amount}&planId=${params.planId}`
    void this.clientKey // referenced to avoid unused warning
    return {
      sessionId: orderId,
      checkoutUrl,
      provider: 'toss',
      planId: params.planId,
      amount: params.amount,
    }
  }

  async verifyPayment(params: {
    sessionId: string
    paymentKey?: string
    orderId?: string
    amount?: number
  }): Promise<BillingResult> {
    // TODO: POST /v1/payments/confirm
    if (!params.paymentKey || !params.orderId || params.amount === undefined) {
      return { success: false, provider: 'toss', error: 'Missing payment params' }
    }
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64')
    const res = await fetch(`${this.baseUrl}/payments/confirm`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey: params.paymentKey, orderId: params.orderId, amount: params.amount }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, provider: 'toss', error: data.message }
    return { success: true, provider: 'toss', transactionId: data.paymentKey }
  }

  async cancelSubscription(_params: { userId: string; subscriptionId: string }): Promise<BillingResult> {
    // TODO: POST /v1/payments/{paymentKey}/cancel
    return { success: false, provider: 'toss', error: 'Not yet implemented' }
  }
}
