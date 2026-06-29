"use client"

import { useState } from "react"
import { Settings, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const PLANS: PlanId[] = ["free", "basic", "pro", "premium"]

interface Props {
  currentPlan: PlanId
}

export function AdminPlanSwitcher({ currentPlan }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<PlanId | null>(null)
  const router = useRouter()

  async function switchPlan(planId: PlanId) {
    if (planId === currentPlan) return
    setLoading(planId)
    try {
      const res = await fetch("/api/admin/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "플랜 변경 실패")
        return
      }
      toast.success(`${PLAN_LABELS[planId]} 플랜으로 변경되었습니다`)
      router.refresh()
      setOpen(false)
    } catch {
      toast.error("오류가 발생했습니다")
    } finally {
      setLoading(null)
    }
  }

  if (process.env.NODE_ENV === "production") return null

  return (
    <div className="mt-4 border border-dashed border-amber-300 rounded-xl p-4 bg-amber-50">
      <button
        className="flex items-center gap-2 text-amber-700 font-medium text-sm w-full"
        onClick={() => setOpen(o => !o)}
      >
        <Settings className="h-4 w-4" />
        🔧 관리자 테스트 모드 — 플랜 강제 변경
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLANS.map(planId => (
            <button
              key={planId}
              disabled={planId === currentPlan || loading !== null}
              onClick={() => switchPlan(planId)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                planId === currentPlan
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f] cursor-default"
                  : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f]"
              }`}
            >
              {loading === planId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : planId === currentPlan ? (
                <CheckCircle className="h-3 w-3" />
              ) : null}
              {PLAN_LABELS[planId]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
