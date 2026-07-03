import { createClient } from "@/lib/supabase/server"
import { ReviewWriter } from "@/components/ai/review-writer"
import { PlanGate } from "@/components/ui/plan-gate"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function ReviewWriterPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">AI 상담 후기 작성</h1>
        <p className="text-sm text-gray-500 mt-1">
          상담 내용을 입력하면 고객이 직접 쓴 것처럼 자연스러운 후기 3가지 버전을 생성합니다.
        </p>
      </div>
      <PlanGate currentPlan={planId} requiredPlan="premium" featureName="AI 상담 후기 작성">
        <ReviewWriter planName={planName} limits={limits} usage={usage} />
      </PlanGate>
    </div>
  )
}
