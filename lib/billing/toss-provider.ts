import type { BillingProviderAdapter, CheckoutSession, PaymentResult } from './billing-provider'
import type { PlanId } from '@/lib/subscription/plans'
import crypto from 'crypto'

// Toss Payments 연동 — 요금제 결제(위젯 1회성 체크아웃) 전용.
// 정기결제(빌링키)는 포트원(PortOne) + 한국결제네트웍스/KCP로 이전됨 (lib/billing/portone-provider.ts 참고).
// 공식 문서: https://docs.tosspayments.com/reference
// 환경변수: TOSS_SECRET_KEY, NEXT_PUBLIC_TOSS_CLIENT_KEY, TOSS_WEBHOOK_SECRET
export class TossProvider implements BillingProviderAdapter {
  readonly provider = 'toss' as const
  private readonly secretKey = process.env.TOSS_SECRET_KEY ?? ''
  private readonly webhookSecret = process.env.TOSS_WEBHOOK_SECRET ?? ''
  private readonly baseUrl = 'https://api.tosspayments.com/v1'

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`
  }

  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
    cancelUrl?: string
  }): Promise<CheckoutSession> {
    const orderId = `FP${params.userId.replace(/-/g, '').slice(0, 10)}${Date.now()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    // 위젯 결제 페이지로 이동 — 실제 Toss SDK는 클라이언트에서 로드
    const checkoutUrl = `${appUrl}/billing/checkout/toss?planId=${params.planId}&orderId=${orderId}`

    return { sessionId: orderId, checkoutUrl, provider: 'toss', planId: params.planId, amount: params.amount }
  }

  async verifyPayment(params: {
    sessionId: string
    paymentKey?: string
    orderId?: string
    amount?: number
  }): Promise<PaymentResult> {
    if (!params.paymentKey || !params.orderId || params.amount === undefined) {
      return { success: false, provider: 'toss', error: 'paymentKey, orderId, amount 필수' }
    }

    // POST /v1/payments/confirm
    const res = await fetch(`${this.baseUrl}/payments/confirm`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey: params.paymentKey,
        orderId: params.orderId,
        amount: params.amount,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, provider: 'toss', error: data.message ?? '결제 확인 실패' }

    return {
      success: true,
      provider: 'toss',
      transactionId: data.paymentKey,
      customerId: data.customerKey ?? undefined,
    }
  }

  async cancelSubscription(params: { providerSubscriptionId: string; immediately?: boolean }): Promise<PaymentResult> {
    // TODO: POST /v1/payments/{paymentKey}/cancel
    // 빌링키 방식은 별도 해지 처리 불필요 (더 이상 청구하지 않으면 됨)
    // placeholder: 실제 연동 시 구현
    void params
    return { success: true, provider: 'toss', transactionId: `toss_cancel_${Date.now()}` }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return false
    // Toss 웹훅: HMAC-SHA256(body, secret) → base64
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body, 'utf8')
      .digest('base64')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  }
}
