"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function FailContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const errorCode = sp.get("code") ?? ""
  const errorMsg = sp.get("message") ?? "결제가 취소되었거나 오류가 발생했습니다."

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1e3a5f]">결제 실패</h2>
        <p className="text-gray-500 mt-2">{errorMsg}</p>
        {errorCode && <p className="text-xs text-gray-400 mt-1">오류 코드: {errorCode}</p>}
      </div>
      <div className="flex gap-3">
        <Button className="bg-[#1e3a5f] text-white" onClick={() => router.push("/billing")}>
          다시 시도
        </Button>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>홈으로</Button>
      </div>
    </div>
  )
}

export default function FailPage() {
  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      }>
        <FailContent />
      </Suspense>
    </div>
  )
}
