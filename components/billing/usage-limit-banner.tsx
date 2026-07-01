"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRight, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { PlanId } from "@/lib/subscription/plans"
import { PLAN_LABELS } from "@/lib/subscription/plans"

interface Props {
  featureLabel: string
  currentPlanId: PlanId
  recommendedPlanId: PlanId | null
  // 기능 페이지 내 인라인 배너용 (업무 흐름 방해 최소화)
  inline?: boolean
}

export function UsageLimitBanner({ featureLabel, currentPlanId, recommendedPlanId, inline = false }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  if (inline) {
    // 기능 페이지 내 인라인: 작고 비침투적인 배너
    return (
      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-amber-800 font-medium">{featureLabel}</span>
          <span className="text-amber-700"> 이번 달 사용 가능 횟수를 모두 사용했습니다.</span>
          {recommendedPlanId && (
            <button
              onClick={() => router.push('/billing')}
              className="ml-1 text-[#1e3a5f] font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              요금제 업그레이드 <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // 페이지 상단 배너
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-medium">{featureLabel}</span> 이번 달 한도를 모두 사용했습니다.{" "}
        {recommendedPlanId && (
          <button
            onClick={() => router.push('/billing')}
            className="text-[#1e3a5f] font-semibold hover:underline"
          >
            {PLAN_LABELS[recommendedPlanId]} 플랜으로 업그레이드
          </button>
        )}
      </p>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
