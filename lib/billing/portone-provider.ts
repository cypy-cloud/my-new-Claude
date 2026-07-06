// 포트원(PortOne) V2 API 연동 — 한국결제네트웍스(KPN) 채널로 정기결제(빌링키) 처리
// 공식 문서: https://developers.portone.io/opi/ko/integration/start/v2/billing/issue
// 환경변수: PORTONE_API_SECRET, NEXT_PUBLIC_PORTONE_STORE_ID, NEXT_PUBLIC_PORTONE_CHANNEL_KEY
//
// 빌링(정기결제) 흐름:
//   1. 클라이언트: PortOne.requestIssueBillingKey({ storeId, channelKey, billingKeyMethod: 'CARD',
//      issueId, customer: { customerId, fullName, phoneNumber, email } })
//      → PG 결제창에서 카드 등록 및 본인인증, 성공 시 응답 객체에 billingKey가 바로 담겨 반환됨
//      (Toss와 달리 별도 리다이렉트/authKey 교환 과정이 없음)
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

export class PortOneProvider {
  private readonly apiSecret = process.env.PORTONE_API_SECRET ?? ''
  private readonly baseUrl = 'https://api.portone.io'

  private authHeader(): string {
    return `PortOne ${this.apiSecret}`
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
