"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { loadPaymentWidget, type PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk"
import { Loader2, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface TossCreditsCheckoutProps {
  orderId: string
  packSize: number
  amount: number
  customerKey: string
  clientKey: string
}

export function TossCreditsCheckout({ orderId, packSize, amount, customerKey, clientKey }: TossCreditsCheckoutProps) {
  const router = useRouter()
  const widgetRef = useRef<PaymentWidgetInstance | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const widget = await loadPaymentWidget(clientKey, customerKey)
        if (cancelled) return

        widgetRef.current = widget

        await widget.renderPaymentMethods(
          "#credits-payment-widget",
          { value: amount },
          { variantKey: "DEFAULT" }
        )
        await widget.renderAgreement("#credits-agreement-widget")

        if (!cancelled) setReady(true)
      } catch (e) {
        console.error("Toss widget init error", e)
        toast.error("결제 위젯 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.")
      }
    }

    init()
    return () => { cancelled = true }
  }, [clientKey, customerKey, amount])

  async function handlePay() {
    if (!widgetRef.current) return
    setLoading(true)
    try {
      await widgetRef.current.requestPayment({
        orderId,
        orderName: `FP AI 추가 크레딧 ${packSize}건`,
        successUrl: `${window.location.origin}/billing/checkout/success?type=credits&packSize=${packSize}&amount=${amount}`,
        failUrl: `${window.location.origin}/billing/checkout/fail`,
      })
    } catch (e: any) {
      if (e?.code !== "USER_CANCEL") {
        toast.error(e?.message ?? "결제 중 오류가 발생했습니다")
      }
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 주문 요약 */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
        <p className="text-xs text-gray-500 mb-1">결제 상품</p>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-600" />
          <p className="font-semibold text-[#1e3a5f] dark:text-white">FP AI 추가 크레딧 {packSize}건</p>
        </div>
        <div className="flex items-end gap-1 mt-1">
          <span className="text-2xl font-bold text-purple-600">₩{amount.toLocaleString()}</span>
          <span className="text-gray-400 text-sm mb-0.5">· 건당 ₩{Math.round(amount / packSize).toLocaleString()}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">구매 후 30일간 유효 · 스크립트·성향분석·SMS 공통 사용</p>
      </div>

      {/* Toss 위젯 마운트 영역 */}
      {!ready && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      )}
      <div id="credits-payment-widget" className={ready ? "" : "hidden"} />
      <div id="credits-agreement-widget" className={ready ? "" : "hidden"} />

      {ready && (
        <div className="space-y-3 pt-2">
          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />결제 처리 중...</>
              : `₩${amount.toLocaleString()} 결제하기`
            }
          </Button>
          <button
            onClick={() => router.back()}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1"
          >
            취소하고 돌아가기
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            토스페이먼츠 보안 결제 · SSL 암호화
          </div>
        </div>
      )}
    </div>
  )
}
