"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ShieldCheck, Tag, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PLANS, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { toast } from "sonner"

interface BillingKeyCheckoutProps {
  planId: PlanId
  storeId: string
  channelKey: string
  userId: string
  fullName: string
  phoneNumber?: string | null
  email?: string | null
  hasBillingKey: boolean
  cardLast4?: string | null
  cardBrand?: string | null
}

export function BillingKeyCheckout({
  planId,
  storeId,
  channelKey,
  userId,
  fullName,
  phoneNumber,
  email,
  hasBillingKey,
  cardLast4,
  cardBrand,
}: BillingKeyCheckoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [refundAgreed, setRefundAgreed] = useState(false)
  const [discountInput, setDiscountInput] = useState("")
  const [applying, setApplying] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number; amount: number } | null>(null)
  const plan = PLANS[planId]
  const amount = appliedDiscount?.amount ?? plan.price

  async function applyDiscountCode() {
    if (!discountInput.trim()) return
    setApplying(true)
    try {
      const res = await fetch("/api/billing/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountInput, planId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "유효하지 않은 할인코드입니다")
        setAppliedDiscount(null)
        return
      }
      setAppliedDiscount({ code: discountInput.trim().toUpperCase(), percent: data.discountPercent, amount: data.discountedAmount })
      toast.success(`할인코드가 적용되었습니다 (${data.discountPercent}% 할인)`)
    } catch {
      toast.error("할인코드 확인 중 오류가 발생했습니다")
    } finally {
      setApplying(false)
    }
  }

  async function submitSubscribe(billingKey?: string) {
    const res = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, discountCode: appliedDiscount?.code, billingKey }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "결제에 실패했습니다")
      return
    }
    toast.success(data.message ?? `${PLAN_LABELS[planId]} 플랜으로 변경되었습니다!`)
    router.push("/billing")
  }

  async function handlePay() {
    if (!refundAgreed) {
      toast.error("서비스 즉시 이용 및 청약철회 제한 안내에 동의해주세요")
      return
    }
    setLoading(true)
    try {
      if (hasBillingKey) {
        await submitSubscribe()
        return
      }

      // 등록된 자동결제 카드가 없으면 먼저 카드를 등록(빌링키 발급)한 뒤 그 자리에서 첫 결제까지 진행
      const PortOne = await import("@portone/browser-sdk/v2")
      const customerId = `fp_${userId.replace(/-/g, "").slice(0, 20)}`
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: "CARD",
        issueId: `bk-${customerId}-${Date.now()}`,
        issueName: "FP AI Assistant 자동결제 카드 등록",
        customer: {
          customerId,
          fullName,
          phoneNumber: phoneNumber || undefined,
          email: email || undefined,
        },
      })

      if (issueResponse?.code) {
        if (issueResponse.code !== "USER_CANCEL") {
          toast.error(issueResponse.message ?? "카드 등록 중 오류가 발생했습니다")
        }
        return
      }
      if (!issueResponse?.billingKey) {
        toast.error("카드 등록에 실패했습니다")
        return
      }

      await submitSubscribe(issueResponse.billingKey)
    } catch (e: any) {
      toast.error(e?.message ?? "결제 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border">
        <p className="text-xs text-gray-500 mb-1">결제 상품</p>
        <p className="font-semibold text-[#1e3a5f]">FP AI Assistant {PLAN_LABELS[planId]} 플랜 (월간)</p>
        <div className="flex items-end gap-1 mt-1">
          {appliedDiscount && (
            <span className="text-sm text-gray-400 line-through mr-1">₩{plan.price.toLocaleString()}</span>
          )}
          <span className="text-2xl font-bold text-[#1e3a5f]">₩{amount.toLocaleString()}</span>
          <span className="text-gray-400 text-sm mb-0.5">/월</span>
        </div>
        {appliedDiscount && (
          <p className="text-xs text-green-600 font-medium mt-1">
            할인코드 {appliedDiscount.code} 적용 · {appliedDiscount.percent}% 할인 · 최초 3개월간 적용
          </p>
        )}
      </div>

      {hasBillingKey ? (
        <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          <span>
            등록된 카드{cardBrand ? ` ${cardBrand}` : ""}{cardLast4 ? ` (끝자리 ${cardLast4})` : ""}로 바로 결제됩니다
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          <span>결제 시 자동결제 카드가 등록되며, 이후 매달 자동으로 결제됩니다</span>
        </div>
      )}

      {!appliedDiscount && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="할인코드가 있으신가요?"
                className="pl-9"
                disabled={applying}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyDiscountCode() } }}
              />
            </div>
            <Button variant="outline" onClick={applyDiscountCode} disabled={applying || !discountInput.trim()}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "적용"}
            </Button>
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 text-xs text-gray-500 px-1">
        <input
          type="checkbox"
          checked={refundAgreed}
          onChange={(e) => setRefundAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          결제 완료 즉시 서비스 이용이 시작되며, 서비스를 1회 이상 이용한 경우 원칙적으로
          청약철회(환불)가 제한됨을 확인했습니다. 자세한 내용은{" "}
          <Link href="/terms#refund" target="_blank" className="underline text-[#1e3a5f]">환불정책</Link>을 참고하세요.
        </span>
      </label>

      <div className="space-y-3 pt-2">
        <Button
          onClick={handlePay}
          disabled={loading || !refundAgreed}
          className="w-full h-12 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-base font-semibold"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />결제 처리 중...</>
            : hasBillingKey ? `₩${amount.toLocaleString()} 결제하기` : `카드 등록하고 ₩${amount.toLocaleString()} 결제하기`
          }
        </Button>
        <button
          onClick={() => router.push("/billing")}
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
