"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function SuccessContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const called = useRef(false)

  const authKey = sp.get("authKey") ?? ""
  const customerKey = sp.get("customerKey") ?? ""

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (called.current || !authKey || !customerKey) return
    called.current = true

    async function register() {
      try {
        const res = await fetch("/api/billing/card/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErrorMsg(data.error ?? "카드 등록에 실패했습니다")
          setStatus("error")
          return
        }
        setStatus("success")
        toast.success("자동결제 카드가 등록되었습니다!")
      } catch {
        setErrorMsg("네트워크 오류가 발생했습니다")
        setStatus("error")
      }
    }

    register()
  }, [authKey, customerKey])

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f]" />
        <p className="text-gray-600">카드를 등록하는 중입니다...</p>
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
          <h2 className="text-2xl font-bold text-[#1e3a5f]">카드 등록 완료!</h2>
          <p className="text-gray-600 mt-2">다음 달부터 자동으로 결제됩니다.</p>
        </div>
        <Button className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={() => router.push("/billing")}>
          요금제 화면으로 이동
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1e3a5f]">카드 등록 실패</h2>
        <p className="text-gray-500 mt-2">{errorMsg}</p>
      </div>
      <Button className="bg-[#1e3a5f] text-white" onClick={() => router.push("/billing")}>
        다시 시도
      </Button>
    </div>
  )
}

export default function RegisterCardSuccessPage() {
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
