"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlanId } from "@/lib/subscription/plans"

const PLAN_ORDER: PlanId[] = ["free", "basic", "pro", "premium"]
const PLAN_LABELS: Record<PlanId, string> = {
  free: "무료",
  basic: "기본",
  pro: "프로",
  premium: "프리미엄",
}

interface PlanGateProps {
  currentPlan: PlanId
  requiredPlan: PlanId
  featureName: string
  children: React.ReactNode
}

export function PlanGate({ currentPlan, requiredPlan, featureName, children }: PlanGateProps) {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan)
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan)
  const hasAccess = currentIndex >= requiredIndex

  if (hasAccess) return <>{children}</>

  return (
    <div className="relative">
      {/* 흐릿하게 뒤에 보이는 UI */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>

      {/* 잠금 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-8 py-8 text-center max-w-sm mx-4">
          <div className="w-14 h-14 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-orange-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {PLAN_LABELS[requiredPlan]} 플랜 전용 기능
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            <span className="font-semibold text-orange-500">{featureName}</span>은<br />
            {PLAN_LABELS[requiredPlan]} 플랜 이상에서 이용할 수 있습니다
          </p>
          <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            <Link href="/billing">
              {PLAN_LABELS[requiredPlan]} 플랜으로 업그레이드
            </Link>
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            현재 플랜: {PLAN_LABELS[currentPlan]}
          </p>
        </div>
      </div>
    </div>
  )
}
