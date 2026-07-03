import { createClient } from "@/lib/supabase/server"
import { FinancialReport } from "@/components/ai/financial-report"
import { PlanGate } from "@/components/ui/plan-gate"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function FinancialReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("plan_type")
    .eq("id", user!.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? "free"
  const planName = PLAN_LABELS[planId]
  const limits = getPlanLimits(planId)
  const usage = await getMonthlyUsage(user!.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">재무설계 간이 리포트</h1>
        <p className="text-sm text-gray-500 mt-1">
          고객의 재무 현황을 분석하여 보장 공백과 맞춤 플랜을 담은 리포트를 생성합니다. 고객에게 직접 출력해 드릴 수 있습니다.
        </p>
      </div>
      <PlanGate currentPlan={planId} requiredPlan="pro" featureName="재무설계 간이 리포트">
        <FinancialReport planName={planName} limits={limits} usage={usage} />
      </PlanGate>
    </div>
  )
}
