import type { BillingProviderAdapter, CheckoutSession, PaymentResult } from './billing-provider'
import type { PlanId } from '@/lib/subscription/plans'
import crypto from 'crypto'

// Stripe 연동
// 공식 문서: https://stripe.com/docs/api
// 환경변수: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// 요금제별 Price ID (Stripe Dashboard에서 생성):
//   STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM
export class StripeProvider implements BillingProviderAdapter {
  readonly provider = 'stripe' as const
  private readonly secretKey = process.env.STRIPE_SECRET_KEY ?? ''
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  private priceId(planId: PlanId): string {
    const map: Record<string, string | undefined> = {
      basic:   process.env.STRIPE_PRICE_BASIC,
      pro:     process.env.STRIPE_PRICE_PRO,
      premium: process.env.STRIPE_PRICE_PREMIUM,
    }
    return map[planId] ?? ''
  }

  async createCheckoutSession(params: {
    userId: string
    planId: PlanId
    amount: number
    returnUrl: string
    cancelUrl?: string
  }): Promise<CheckoutSession> {
    // TODO: stripe.checkout.sessions.create({ mode: 'subscription', ... })
    // 실제 구현 시 stripe npm 패키지 설치 필요: npm install stripe
    //
    // const stripe = new Stripe(this.secretKey)
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   line_items: [{ price: this.priceId(params.planId), quantity: 1 }],
    //   success_url: params.returnUrl + '?session_id={CHECKOUT_SESSION_ID}',
    //   cancel_url: params.cancelUrl ?? params.returnUrl,
    //   metadata: { userId: params.userId, planId: params.planId },
    // })

    void this.secretKey
    const sessionId = `cs_placeholder_${params.planId}_${Date.now()}`
    return {
      sessionId,
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      provider: 'stripe',
      planId: params.planId,
      amount: params.amount,
    }
  }

  async verifyPayment(params: { sessionId: string }): Promise<PaymentResult> {
    // TODO: stripe.checkout.sessions.retrieve(params.sessionId)
    // const stripe = new Stripe(this.secretKey)
    // const session = await stripe.checkout.sessions.retrieve(params.sessionId)
    // if (session.payment_status !== 'paid') return { success: false, ... }
    // return { success: true, customerId: session.customer, subscriptionId: session.subscription }

    return { success: false, provider: 'stripe', error: `미구현 (sessionId: ${params.sessionId})` }
  }

  async cancelSubscription(params: { providerSubscriptionId: string; immediately?: boolean }): Promise<PaymentResult> {
    // TODO: stripe.subscriptions.update(id, { cancel_at_period_end: !immediately })
    // 또는 stripe.subscriptions.cancel(id) for immediate

    void params
    return { success: false, provider: 'stripe', error: '미구현 — Stripe 연동 후 활성화' }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return false
    // Stripe 웹훅: stripe.webhooks.constructEvent(body, signature, secret)
    // 여기서는 수동 HMAC 검증 (stripe npm 없이)
    try {
      const parts = signature.split(',')
      const tPart = parts.find(p => p.startsWith('t='))
      const v1Part = parts.find(p => p.startsWith('v1='))
      if (!tPart || !v1Part) return false
      const timestamp = tPart.slice(2)
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(`${timestamp}.${body}`)
        .digest('hex')
      return crypto.timingSafeEqual(Buffer.from(v1Part.slice(3)), Buffer.from(expected))
    } catch {
      return false
    }
  }
}
