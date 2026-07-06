"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRight, TrendingUp, X, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import type { PlanId } from "@/lib/subscription/plans"
import { PLAN_LABELS } from "@/lib/subscription/plans"
import { CreditsPurchaseModal } from "@/components/billing/credits-purchase-modal"

interface Props {
  featureLabel: string
  currentPlanId: PlanId
  recommendedPlanId: PlanId | null
  // 기능 페이지 내 인라인 배너용 (업무 흐름 방해 최소화)
  inline?: boolean
}

interface UsageWarningBannerProps {
  featureLabel: string
  used: number
  limit: number
  recommendedPlanId?: PlanId | null
  inline?: boolean
}

// 70% 이상 사용 시 표시되는 경고 배너
export function UsageWarningBanner({ featureLabel, used, limit, recommendedPlanId, inline = false }: UsageWarningBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || limit === 0) return null
  const pct = Math.round((used / limit) * 100)
  if (pct < 70) return null

  const isNearLimit = pct >= 90

  const barColor = isNearLimit ? "bg-red-500" : "bg-amber-400"
  const bgColor = isNearLimit ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
  const textColor = isNearLimit ? "text-red-800" : "text-amber-800"
  const subColor = isNearLimit ? "text-red-600" : "text-amber-700"
  const iconColor = isNearLimit ? "text-red-500" : "text-amber-500"
  const dismissColor = isNearLimit ? "text-red-300 hover:text-red-500" : "text-amber-300 hover:text-amber-500"

  return (
    <div className={`flex items-start gap-2.5 p-3 border rounded-xl text-sm ${bgColor} ${inline ? "" : "mb-2"}`}>
      {isNearLimit
        ? <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
        : <TrendingUp className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`font-semibold ${textColor}`}>
            {featureLabel} {pct}% 사용 중 ({used}/{limit}회)
          </span>
        </div>
        <div className="w-full bg-white/60 rounded-full h-1.5 mb-1.5">
          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className={`text-xs ${subColor}`}>
          {isNearLimit
            ? `이번 달 한도가 거의 소진됩니다. `
            : `이번 달 한도의 70%를 사용했습니다. `
          }
          {recommendedPlanId && (
            <button
              onClick={() => router.push('/billing')}
              className="text-[#1e3a5f] font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              업그레이드하면 더 여유있게 사용 가능합니다 <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className={`shrink-0 ${dismissColor}`}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function UsageLimitBanner({ featureLabel, currentPlanId, recommendedPlanId, inline = false }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [creditsModalOpen, setCreditsModalOpen] = useState(false)

  if (dismissed) return null

  if (inline) {
    return (
      <>
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-amber-800 font-medium">{featureLabel}</span>
            <span className="text-amber-700"> 이번 달 사용 가능 횟수를 모두 사용했습니다.</span>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <button
                onClick={() => setCreditsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Zap className="h-3 w-3" />
                10건 추가 ₩2,000
              </button>
              {recommendedPlanId && (
                <button
                  onClick={() => router.push('/billing')}
                  className="text-[#1e3a5f] text-xs font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  요금제 업그레이드 <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <CreditsPurchaseModal
          open={creditsModalOpen}
          onClose={() => setCreditsModalOpen(false)}
          featureLabel={featureLabel}
        />
      </>
    )
  }

  // 페이지 상단 배너
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <div className="text-sm text-amber-800 flex-1">
          <span className="font-medium">{featureLabel}</span> 이번 달 한도를 모두 사용했습니다.{" "}
          <button
            onClick={() => setCreditsModalOpen(true)}
            className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Zap className="h-3 w-3" />
            10건 추가 ₩2,000
          </button>
          {recommendedPlanId && (
            <button
              onClick={() => router.push('/billing')}
              className="ml-2 text-[#1e3a5f] font-semibold hover:underline"
            >
              또는 {PLAN_LABELS[recommendedPlanId]} 플랜 업그레이드
            </button>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <CreditsPurchaseModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        featureLabel={featureLabel}
      />
    </>
  )
}
