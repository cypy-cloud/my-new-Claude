"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { toast } from "sonner"

function SuccessContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const called = useRef(false)

  const paymentKey = sp.get("paymentKey") ?? ""
  const orderId = sp.get("orderId") ?? ""
  const amount = Number(sp.get("amount") ?? "0")
  const planId = sp.get("planId") as PlanId | null

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (called.current || !paymentKey || !orderId || !planId) return
    called.current = true

    async function verify() {
      try {
        const res = await fetch("/api/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: orderId, planId, paymentKey, orderId, amount }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErrorMsg(data.error ?? "결제 확인에 실패했습니다")
          setStatus("error")
          return
        }
        setStatus("success")
        toast.success(`${PLAN_LABELS[planId!]} 플랜으로 변경되었습니다!`)
      } catch {
        setErrorMsg("네트워크 오류가 발생했습니다")
        setStatus("error")
      }
    }

    verify()
  }, [paymentKey, orderId, planId, amount])

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
          <h2 className="text-2xl font-bold text-[#1e3a5f]">결제 완료!</h2>
          {planId && (
            <p className="text-gray-600 mt-2">{PLAN_LABELS[planId]} 플랜이 즉시 적용되었습니다.</p>
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1e3a5f]">결제 확인 실패</h2>
        <p className="text-gray-500 mt-2">{errorMsg}</p>
      </div>
      <Button className="bg-[#1e3a5f] text-white" onClick={() => router.push("/billing")}>
        다시 시도
      </Button>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
