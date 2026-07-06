import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CustomerAnalysis } from "@/components/ai/customer-analysis"
import { PlanGate } from "@/components/ui/plan-gate"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function CustomerAnalysisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminSupabase = createAdminClient()
  const { data: profile } = await (adminSupabase as any)
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
        <h1 className="text-2xl font-bold text-gray-900">고객 성향 분석</h1>
        <p className="text-sm text-gray-500 mt-1">
          고객 정보를 입력하면 AI가 성향을 분석하고 맞춤 상품과 첫마디를 추천해드립니다
        </p>
      </div>
      <PlanGate currentPlan={planId} requiredPlan="basic" featureName="고객 성향 분석">
        <CustomerAnalysis planName={planName} planId={planId} limits={limits} usage={usage} />
      </PlanGate>
    </div>
  )
}
