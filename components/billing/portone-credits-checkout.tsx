"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PortOneCreditsCheckoutProps {
  paymentId: string
  packSize: number
  amount: number
  storeId: string
  channelKey: string
  fullName: string
  phoneNumber?: string | null
  email?: string | null
}

export function PortOneCreditsCheckout({
  paymentId,
  packSize,
  amount,
  storeId,
  channelKey,
  fullName,
  phoneNumber,
  email,
}: PortOneCreditsCheckoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    try {
      const PortOne = await import("@portone/browser-sdk/v2")
      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: `FP AI 추가 크레딧 ${packSize}건`,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          fullName,
          phoneNumber: phoneNumber || undefined,
          email: email || undefined,
        },
      })

      if (response?.code) {
        if (response.code !== "USER_CANCEL") {
          toast.error(response.message ?? "결제 중 오류가 발생했습니다")
        }
        return
      }

      const res = await fetch("/api/billing/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey: paymentId, orderId: paymentId, amount, featureType: "all" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "결제 확인에 실패했습니다")
        return
      }

      toast.success(data.message ?? `${data.creditsAdded ?? packSize}건 크레딧이 충전되었습니다!`)
      router.push("/billing")
    } catch (e: any) {
      toast.error(e?.message ?? "결제 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
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
          포트원 보안 결제 · SSL 암호화
        </div>
      </div>
    </div>
  )
}
