"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { clientTrackUpgradeClick } from "@/lib/analytics/client-track"
import { PLANS, type PlanId } from "@/lib/subscription/plans"

interface UsageStatus {
  smsCount: number
  scriptCount: number
  pdfUploadCount: number
  pdfAnalysisCount: number
  contentCount: number
  newsletterCount: number
}

interface Props {
  planId: string
  isCurrent: boolean
  isDowngrade: boolean
  currentPlanId?: PlanId
  currentUsage?: UsageStatus | null
}

// 현재 플랜 대비 사용량 요약 (사용 중인 기능만)
function buildUsageSummary(
  currentPlanId: PlanId,
  targetPlanId: PlanId,
  usage: UsageStatus
): string[] {
  const current = PLANS[currentPlanId]
  const target = PLANS[targetPlanId]
  const lines: string[] = []

  const checks: Array<{ label: string; used: number; currentLimit: number; targetLimit: number }> = [
    { label: 'AI 문자/카톡', used: usage.smsCount, currentLimit: current.smsLimit, targetLimit: target.smsLimit },
    { label: 'AI 스크립트', used: usage.scriptCount, currentLimit: current.scriptLimit, targetLimit: target.scriptLimit },
    { label: 'PDF 업로드', used: usage.pdfUploadCount, currentLimit: current.pdfUploadLimit, targetLimit: target.pdfUploadLimit },
    { label: 'PDF 분석', used: usage.pdfAnalysisCount, currentLimit: current.pdfAnalysisLimit, targetLimit: target.pdfAnalysisLimit },
  ]

  for (const c of checks) {
    if (c.used > 0 && c.targetLimit > 0) {
      const remaining = Math.max(0, c.targetLimit - c.used)
      lines.push(`• ${c.label}: ${c.used}/${c.currentLimit}회 사용 → ${c.targetLimit}회 한도에서 ${remaining}회 남음`)
    }
  }

  return lines
}

export function UpgradeButton({ planId, isCurrent, isDowngrade, currentPlanId, currentUsage }: Props) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const label = isCurrent ? "현재 사용 중" : isDowngrade ? "다운그레이드" : "업그레이드"

  const hasUsage = currentUsage && (
    currentUsage.smsCount > 0 ||
    currentUsage.scriptCount > 0 ||
    currentUsage.pdfUploadCount > 0 ||
    currentUsage.pdfAnalysisCount > 0
  )

  const usageLines = (!isDowngrade && currentPlanId && currentUsage && hasUsage)
    ? buildUsageSummary(currentPlanId, planId as PlanId, currentUsage)
    : []

  function handleClick() {
    if (isCurrent) return
    clientTrackUpgradeClick({ targetPlan: planId })

    if (isDowngrade) {
      router.push(`/billing/checkout?plan=${planId}&action=downgrade`)
      return
    }

    // 사용량이 있으면 확인 다이얼로그 표시
    if (usageLines.length > 0) {
      setShowConfirm(true)
      return
    }

    proceed()
  }

  async function proceed() {
    setShowConfirm(false)
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval: 'month' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '결제 준비에 실패했습니다')
        return
      }
      router.push(data.checkoutUrl)
    } catch {
      toast.error('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        className="w-full mt-4"
        variant={isCurrent || isDowngrade ? "outline" : "default"}
        disabled={isCurrent || loading}
        onClick={handleClick}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {label}
      </Button>

      {/* 업그레이드 확인 다이얼로그 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#1e3a5f]">지금 업그레이드하시겠어요?</h3>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 mb-1">이번 달 사용 현황</p>
              {usageLines.map((line, i) => (
                <p key={i} className="text-xs text-gray-700">{line}</p>
              ))}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              매월 1일에 업그레이드하면 새 플랜 한도를 <span className="font-semibold text-[#1e3a5f]">100% 전부</span> 사용하실 수 있습니다.
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
                onClick={proceed}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                지금 업그레이드
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
