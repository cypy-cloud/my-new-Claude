"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function FailContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const message = sp.get("message") ?? "카드 등록이 취소되었거나 실패했습니다"

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1e3a5f]">카드 등록 실패</h2>
        <p className="text-gray-500 mt-2">{message}</p>
      </div>
      <Button className="bg-[#1e3a5f] text-white" onClick={() => router.push("/billing")}>
        요금제 화면으로 돌아가기
      </Button>
    </div>
  )
}

export default function RegisterCardFailPage() {
  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <FailContent />
      </Suspense>
    </div>
  )
}
