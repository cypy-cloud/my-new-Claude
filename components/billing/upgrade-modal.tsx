"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight, X } from "lucide-react"
import { PLANS, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { clientTrackUpgradeClick } from "@/lib/analytics/client-track"

interface Props {
  open: boolean
  onClose: () => void
  featureLabel?: string      // 어떤 기능에서 한도 초과가 발생했는지
  currentPlanId: PlanId
  recommendedPlanId: PlanId
}

export function UpgradeModal({ open, onClose, featureLabel, currentPlanId, recommendedPlanId }: Props) {
  const router = useRouter()

  if (!open) return null

  const recommended = PLANS[recommendedPlanId]

  function handleUpgrade() {
    clientTrackUpgradeClick({ targetPlan: recommendedPlanId, source: 'limit_modal' })
    onClose()
    // KPN MID가 정기결제(빌링키) 전용이라 일반(단건)결제가 지원되지 않아
    // (2026-07-21 확인), /api/billing/checkout(일반결제 세션 생성용, 여기선 실제로
    // 쓰이지 않던 호출이었음 — 2026-07-22 정리) 대신 자동결제 카드 등록 방식의
    // 체크아웃으로 바로 보낸다 (upgrade-button.tsx와 동일한 수정).
    router.push(`/billing/checkout/billing-key?planId=${recommendedPlanId}`)
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
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
          >
            {PLAN_LABELS[recommendedPlanId]} 플랜으로 업그레이드 <ArrowRight className="h-4 w-4" />
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
