"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight, X, Loader2 } from "lucide-react"
import { PLANS, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { clientTrackUpgradeClick } from "@/lib/analytics/client-track"
import { toast } from "sonner"

interface Props {
  open: boolean
  onClose: () => void
  featureLabel?: string      // 어떤 기능에서 한도 초과가 발생했는지
  currentPlanId: PlanId
  recommendedPlanId: PlanId
}

export function UpgradeModal({ open, onClose, featureLabel, currentPlanId, recommendedPlanId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const recommended = PLANS[recommendedPlanId]

  async function handleUpgrade() {
    clientTrackUpgradeClick({ targetPlan: recommendedPlanId, source: 'limit_modal' })
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: recommendedPlanId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '결제 준비에 실패했습니다')
        return
      }
      onClose()
      router.push(data.checkoutUrl)
    } catch {
      toast.error('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  function handleViewPlans() {
    onClose()
    router.push('/billing')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 아이콘 */}
        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
          <Zap className="h-6 w-6 text-orange-500" />
        </div>

        {/* 메시지 */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {featureLabel ? `${featureLabel} 한도를 모두 사용했습니다` : '이번 달 한도를 모두 사용했습니다'}
        </h3>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          이번 달 사용 가능 횟수를 모두 사용했습니다. 더 많은 생성이 필요하시면 상위 요금제로 업그레이드해 주세요.
        </p>

        {/* 추천 플랜 카드 */}
        <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#1e3a5f] font-semibold">추천 플랜</span>
            <span className="text-xs bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full">
              {PLAN_LABELS[currentPlanId]} → {PLAN_LABELS[recommendedPlanId]}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-xl font-bold text-[#1e3a5f]">₩{recommended.price.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mb-0.5">/월</span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> 처리 중...</>
              : <>{PLAN_LABELS[recommendedPlanId]} 플랜으로 업그레이드 <ArrowRight className="h-4 w-4" /></>
            }
          </Button>
          <button
            onClick={handleViewPlans}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
          >
            전체 요금제 비교 보기
          </button>
        </div>
      </div>
    </div>
  )
}
