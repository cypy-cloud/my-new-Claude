"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLANS, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { toast } from "sonner"

function CheckoutContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const plan = sp.get("plan") as PlanId | null
  const sessionId = sp.get("session_id")
  const isMock = sp.get("mock") === "1"
  const action = sp.get("action")
  const interval: "month" | "year" = sp.get("interval") === "year" ? "year" : "month"

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // mock 결제 자동 완료
  useEffect(() => {
    if (isMock && sessionId && plan && status === "idle") {
      verifyPayment()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMock, sessionId, plan])

  async function verifyPayment() {
    if (!sessionId || !plan) return
    setStatus("verifying")
    try {
      const amount = interval === "year" && PLANS[plan].annualPrice > 0 ? PLANS[plan].annualPrice : PLANS[plan].price
      const res = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, planId: plan, orderId: sessionId, amount, interval }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "결제 확인에 실패했습니다")
        setStatus("error")
        return
      }
      setStatus("success")
      toast.success(`${PLAN_LABELS[plan]} 플랜으로 변경되었습니다!`)
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다")
      setStatus("error")
    }
  }

  // 다운그레이드 확인 화면
  if (action === "downgrade" && plan) {
    return <DowngradeConfirm plan={plan} />
  }

  if (status === "idle" && !isMock) {
    // 실제 결제 provider 화면 (포트원/Stripe로 리다이렉트 전 중간 화면)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <CreditCard className="h-8 w-8 text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#1e3a5f]">결제 준비 중</h2>
          {plan && (
            <p className="text-gray-500 mt-2">
              {PLAN_LABELS[plan as PlanId] ?? plan} 플랜 · ₩{PLANS[plan as PlanId]?.price.toLocaleString()}/월
            </p>
          )}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm text-center">
          <p className="text-amber-700 text-sm font-medium">🔧 결제 시스템 준비 중</p>
          <p className="text-amber-600 text-xs mt-1">전자결제 대행사 연동 예정입니다. 현재는 테스트 모드로 바로 적용됩니다.</p>
        </div>
        <Button
          className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
          onClick={verifyPayment}
        >
          테스트: 결제 완료 처리
        </Button>
        <Button variant="ghost" onClick={() => router.push("/billing")}>취소</Button>
      </div>
    )
  }

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f]" />
        <p className="text-gray-600">결제를 확인하는 중입니다...</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1e3a5f]">플랜 변경 완료!</h2>
          {plan && (
            <p className="text-gray-600 mt-2">
              {PLAN_LABELS[plan as PlanId]} 플랜이 즉시 적용되었습니다.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={() => router.push("/dashboard")}>
            대시보드로 이동
          </Button>
          <Button variant="outline" onClick={() => router.push("/billing")}>요금제 확인</Button>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#1e3a5f]">결제 실패</h2>
          <p className="text-gray-500 mt-2">{errorMsg}</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#1e3a5f] text-white" onClick={() => router.push("/billing")}>
            다시 시도
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>취소</Button>
        </div>
      </div>
    )
  }

  return null
}

function DowngradeConfirm({ plan }: { plan: PlanId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "변경에 실패했습니다")
        return
      }
      router.push(data.checkoutUrl)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1e3a5f]">플랜 다운그레이드</h2>
        <p className="text-gray-500 mt-2">
          <strong>{PLAN_LABELS[plan]}</strong> 플랜으로 변경하시겠습니까?
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full text-sm text-amber-700">
        <p className="font-medium mb-1">⚠️ 다운그레이드 시 주의사항</p>
        <ul className="space-y-1 text-xs list-disc list-inside text-amber-600">
          <li>이번 달 남은 기간은 현재 플랜 한도가 유지됩니다</li>
          <li>다음 달부터 변경된 한도가 적용됩니다</li>
          <li>초과 사용된 기능은 변경 즉시 제한될 수 있습니다</li>
        </ul>
      </div>
      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/billing")} disabled={loading}>취소</Button>
        <Button className="flex-1 bg-amber-500 text-white hover:bg-amber-600" onClick={confirm} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          다운그레이드 확인
        </Button>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </div>
  )
}
