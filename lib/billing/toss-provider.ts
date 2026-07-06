import type { BillingProviderAdapter, CheckoutSession, PaymentResult } from './billing-provider'
import type { PlanId } from '@/lib/subscription/plans'
import crypto from 'crypto'

// Toss Payments 연동
// 공식 문서: https://docs.tosspayments.com/reference
// 환경변수: TOSS_SECRET_KEY, NEXT_PUBLIC_TOSS_CLIENT_KEY, TOSS_WEBHOOK_SECRET
//
// 빌링(정기결제) 흐름:
//   1. 클라이언트: TossPayments(clientKey).requestBillingAuth('카드', { customerKey, successUrl, failUrl })
//      → 카드 등록 화면으로 이동, 성공 시 successUrl로 authKey&customerKey 쿼리와 함께 리다이렉트
//   2. 서버: issueBillingKey(authKey, customerKey)로 authKey를 billingKey로 교환, profiles에 저장
//   3. 매달 크론: chargeBillingKey(billingKey, customerKey, amount, orderId, orderName)으로 자동 청구
//   참고: https://docs.tosspayments.com/guides/billing/integration
export interface BillingKeyResult {
  success: boolean
  billingKey?: string
  cardLast4?: string
  cardBrand?: string
  error?: string
}

export interface ChargeResult {
  success: boolean
  paymentKey?: string
  approvedAt?: string
  error?: string
  errorCode?: string
}

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

  // authKey(카드 등록 인증 성공 시 리다이렉트로 받은 값)를 billingKey로 교환한다.
  async issueBillingKey(authKey: string, customerKey: string): Promise<BillingKeyResult> {
    const res = await fetch(`${this.baseUrl}/billing/authorizations/issue`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, customerKey }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message ?? '카드 등록에 실패했습니다' }

    return {
      success: true,
      billingKey: data.billingKey,
      cardLast4: data.card?.number ? String(data.card.number).slice(-4) : undefined,
      cardBrand: data.card?.issuerCode ?? data.card?.acquirerCode ?? undefined,
    }
  }

  // 빌링키로 자동 청구 (구독 갱신, 크레딧 원클릭 결제 등)
  async chargeBillingKey(params: {
    billingKey: string
    customerKey: string
    amount: number
    orderId: string
    orderName: string
  }): Promise<ChargeResult> {
    const res = await fetch(`${this.baseUrl}/billing/${params.billingKey}`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerKey: params.customerKey,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.message ?? '결제 승인에 실패했습니다', errorCode: data.code }
    }
    return { success: true, paymentKey: data.paymentKey, approvedAt: data.approvedAt }
  }

  // 카드 변경/해지 시 빌링키 폐기. Toss는 별도 삭제 API를 제공하지 않으므로
  // profiles에서 저장된 빌링키를 제거하는 것으로 처리한다(호출부에서 DB 업데이트).
  async deleteBillingKey(): Promise<{ success: true }> {
    return { success: true }
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
