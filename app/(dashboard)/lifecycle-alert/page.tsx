import { createClient } from "@/lib/supabase/server"
import { LifecycleAlert } from "@/components/ai/lifecycle-alert"
import { PlanGate } from "@/components/ui/plan-gate"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function LifecycleAlertPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">생애주기 알림</h1>
        <p className="text-sm text-gray-500 mt-1">
          고객의 생애주기를 분석하여 향후 12개월 내 최적의 연락 타이밍과 맞춤 멘트를 제안합니다.
        </p>
      </div>
      <PlanGate currentPlan={planId} requiredPlan="premium" featureName="생애주기 알림">
        <LifecycleAlert planName={planName} limits={limits} usage={usage} />
      </PlanGate>
    </div>
  )
}
