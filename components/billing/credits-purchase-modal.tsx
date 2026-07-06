"use client"

import { useState, useEffect } from "react"
import { Zap, X, CheckCircle, Clock, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const PACK_SIZE = 10
const PACK_PRICE = 2000

interface Props {
  open: boolean
  onClose: () => void
  featureLabel?: string
  onSuccess?: (newTotal: number) => void
}

export function CreditsPurchaseModal({ open, onClose, featureLabel = "AI 기능", onSuccess }: Props) {
  const [step, setStep] = useState<'confirm' | 'paying' | 'done'>('confirm')
  const [currentCredits, setCurrentCredits] = useState<number | null>(null)

  useEffect(() => {
    if (!open) { setStep('confirm'); return }
    fetch('/api/billing/credits/purchase?feature=all')
      .then(r => r.json())
      .then(d => setCurrentCredits(d.totalCredits ?? 0))
      .catch(() => setCurrentCredits(0))
  }, [open])

  async function handlePurchase() {
    setStep('paying')
    try {
      // TODO: 빌링키 자동결제 구현 후 → 등록된 카드가 있으면 Toss 페이지 이동 없이
      //       /api/billing/credits/charge-billing-key 직접 호출로 원클릭 결제 처리
      //       등록 카드 없을 때만 아래 Toss 결제 페이지로 이동하도록 분기
      // Toss 결제 페이지로 이동 (credits 전용 checkout)
      const orderId = `credits-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const params = new URLSearchParams({
        orderId,
        amount: String(PACK_PRICE),
        packSize: String(PACK_SIZE),
      })
      window.location.href = `/billing/checkout/credits?${params.toString()}`
    } catch {
      toast.error("결제 초기화에 실패했습니다")
      setStep('confirm')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>

        {step === 'confirm' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-base">추가 크레딧 구매</h2>
                <p className="text-xs text-gray-500">{featureLabel} 한도 초과 시 사용</p>
              </div>
            </div>

            {/* 팩 정보 */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">10건 추가권</span>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">₩2,000</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">건당 ₩200 · 스크립트·성향분석·SMS 공통 사용</div>
            </div>

            {/* 혜택 목록 */}
            <ul className="space-y-2 mb-5">
              {[
                "AI 상담 스크립트, 성향분석, SMS 문자 모두 사용 가능",
                "구매 후 30일간 유효 (미사용 크레딧 소멸)",
                "여러 팩 중복 구매 가능",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            {/* 현재 크레딧 */}
            {currentCredits !== null && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mb-4">
                <Clock className="h-3.5 w-3.5" />
                현재 잔여 크레딧: <strong className="text-gray-700 dark:text-gray-300">{currentCredits}건</strong>
              </div>
            )}

            <Button onClick={handlePurchase} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
              <Zap className="h-4 w-4 mr-1.5" />
              ₩2,000 결제하기
            </Button>
            <div className="flex items-center justify-center gap-1 mt-2.5 text-xs text-gray-400">
              <ShieldCheck className="h-3 w-3" />
              Toss Payments 안전 결제
            </div>
          </>
        )}

        {step === 'paying' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">결제 페이지로 이동 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}
