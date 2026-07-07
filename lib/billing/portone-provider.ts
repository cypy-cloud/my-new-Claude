import type { BillingProviderAdapter, CheckoutSession, PaymentResult } from './billing-provider'
import type { PlanId } from '@/lib/subscription/plans'
import crypto from 'crypto'

// 포트원(PortOne) V2 API 연동 — 한국결제네트웍스(KPN) 채널로 일반결제/정기결제(빌링키) 처리
// 공식 문서: https://developers.portone.io/opi/ko/integration/start/v2/billing/issue
// 환경변수: PORTONE_API_SECRET, PORTONE_WEBHOOK_SECRET,
//          NEXT_PUBLIC_PORTONE_STORE_ID, NEXT_PUBLIC_PORTONE_CHANNEL_KEY
//
// 일반결제(요금제/크레딧 1회 결제) 흐름:
//   1. 클라이언트: PortOne.requestPayment({ storeId, channelKey, paymentId, orderName,
//      totalAmount, currency: 'CURRENCY_KRW', payMethod: 'CARD', customer }) 호출,
//      결제창에서 카드 인증 완료 시 그 자리에서 응답(Promise)으로 결과를 받음 (리다이렉트 불필요)
//   2. 서버: verifyPayment(paymentId, amount)로 실제 결제 상태를 재조회해 확정
//
// 빌링(정기결제) 흐름:
//   1. 클라이언트: PortOne.requestIssueBillingKey({ storeId, channelKey, billingKeyMethod: 'CARD',
//      issueId, customer: { customerId, fullName, phoneNumber, email } })
//      → PG 결제창에서 카드 등록 및 본인인증, 성공 시 응답 객체에 billingKey가 바로 담겨 반환됨
//   2. 서버: verifyBillingKey(billingKey)로 실제 발급된 빌링키인지, 소유자가 맞는지 확인 후 profiles에 저장
//   3. 매달 크론/원클릭 결제: chargeBillingKey(billingKey, customerId, amount, paymentId, orderName)으로 청구
export interface BillingKeyInfo {
  success: boolean
  billingKey?: string
  customerId?: string
  cardLast4?: string
  cardBrand?: string
  error?: string
}

export interface ChargeResult {
  success: boolean
  paymentId?: string
  status?: string
  error?: string
  errorCode?: string
}

export class PortOneProvider implements BillingProviderAdapter {
  readonly provider = 'portone' as const
  private readonly apiSecret = process.env.PORTONE_API_SECRET ?? ''
  private readonly webhookSecret = process.env.PORTONE_WEBHOOK_SECRET ?? ''
  private readonly baseUrl = 'https://api.portone.io'

  private authHeader(): string {
    return `PortOne ${this.apiSecret}`
  }

  // 요금제 결제창으로 이동할 URL 생성 (paymentId는 클라이언트 SDK가 그대로 사용)
  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    interval: 'month' | 'year'
    returnUrl: string
    cancelUrl?: string
  }): Promise<CheckoutSession> {
    const paymentId = `plan${params.userId.replace(/-/g, '').slice(0, 10)}${Date.now()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const checkoutUrl = `${appUrl}/billing/checkout/portone?planId=${params.planId}&paymentId=${paymentId}&interval=${params.interval}`

    return { sessionId: paymentId, checkoutUrl, provider: 'portone', planId: params.planId, amount: params.amount, interval: params.interval }
  }

  // 클라이언트에서 결제 완료 응답을 받은 뒤, 서버에서 실제 결제 상태를 재조회해 확정한다.
  async verifyPayment(params: {
    sessionId: string
    paymentKey?: string
    orderId?: string
    amount?: number
  }): Promise<PaymentResult> {
    const paymentId = params.orderId ?? params.sessionId
    if (!paymentId || params.amount === undefined) {
      return { success: false, provider: 'portone', error: 'paymentId, amount 필수' }
    }

    const res = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: { Authorization: this.authHeader() },
    })
    const data = await res.json()
    if (!res.ok) return { success: false, provider: 'portone', error: data.message ?? '결제 확인 실패' }

    const status = data.status ?? data.payment?.status
    if (status !== 'PAID') {
      return { success: false, provider: 'portone', error: `결제 상태: ${status}` }
    }

    const paidAmount = data.amount?.total ?? data.payment?.amount?.total
    if (paidAmount !== params.amount) {
      return { success: false, provider: 'portone', error: '결제 금액이 일치하지 않습니다' }
    }

    return {
      success: true,
      provider: 'portone',
      transactionId: paymentId,
      customerId: data.customer?.id ?? undefined,
    }
  }

  async cancelSubscription(params: { providerSubscriptionId: string; immediately?: boolean }): Promise<PaymentResult> {
    // 빌링키 방식은 별도 해지 처리 불필요 (더 이상 청구하지 않으면 됨)
    void params
    return { success: true, provider: 'portone', transactionId: `portone_cancel_${Date.now()}` }
  }

  // 포트원 웹훅(Svix 기반)은 webhook-id/webhook-timestamp/webhook-signature 3개 헤더가 필요하므로,
  // 호출부(webhook 라우트)에서 "id.timestamp.signature" 형식으로 조합해 signature로 전달한다.
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return false
    const [id, timestamp, headerSig] = signature.split('.')
    if (!id || !timestamp || !headerSig) return false

    const secretBytes = Buffer.from(
      this.webhookSecret.startsWith('whsec_') ? this.webhookSecret.slice(6) : this.webhookSecret,
      'base64'
    )
    const signedContent = `${id}.${timestamp}.${body}`
    const expected = crypto.createHmac('sha256', secretBytes).update(signedContent, 'utf8').digest('base64')

    return headerSig.split(' ').some((part) => {
      const candidate = part.includes(',') ? part.split(',')[1] : part
      try {
        return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
      } catch {
        return false
      }
    })
  }

  // 클라이언트 SDK가 발급한 billingKey가 실제로 우리 상점에서 발급된 것인지, 어떤 카드인지 서버에서 재확인한다.
  async verifyBillingKey(billingKey: string): Promise<BillingKeyInfo> {
    const res = await fetch(`${this.baseUrl}/billing-keys/${encodeURIComponent(billingKey)}`, {
      method: 'GET',
      headers: { Authorization: this.authHeader() },
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message ?? '빌링키 확인에 실패했습니다' }

    const cardMethod = data.methods?.find((m: any) => m.type === 'BillingKeyPaymentMethodCard')?.card
    return {
      success: true,
      billingKey: data.billingKey,
      customerId: data.customer?.id,
      cardLast4: cardMethod?.number ? String(cardMethod.number).slice(-4) : undefined,
      cardBrand: cardMethod?.name ?? cardMethod?.issuer ?? undefined,
    }
  }

  // 빌링키로 자동 청구 (구독 갱신, 크레딧 원클릭 결제 등). paymentId는 영문/숫자만 허용됨(하이픈 불가).
  async chargeBillingKey(params: {
    billingKey: string
    customerId: string
    amount: number
    paymentId: string
    orderName: string
  }): Promise<ChargeResult> {
    const res = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(params.paymentId)}/billing-key`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: {
          billingKey: params.billingKey,
          orderName: params.orderName,
          customer: { id: params.customerId },
          amount: { total: params.amount },
          currency: 'KRW',
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.message ?? '결제 승인에 실패했습니다', errorCode: data.type ?? data.code }
    }
    const status = data.payment?.status ?? data.status
    if (status && status !== 'PAID') {
      return { success: false, error: data.message ?? `결제 상태: ${status}`, errorCode: status }
    }
    return { success: true, paymentId: params.paymentId, status: status ?? 'PAID' }
  }

  // 카드 변경/해지 시 빌링키 폐기.
  async deleteBillingKey(billingKey: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${this.baseUrl}/billing-keys/${encodeURIComponent(billingKey)}`, {
      method: 'DELETE',
      headers: { Authorization: this.authHeader() },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.message ?? '빌링키 삭제에 실패했습니다' }
    }
    return { success: true }
  }
}
