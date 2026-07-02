import { createClient } from "@/lib/supabase/server"
import { ObjectionHandler } from "@/components/ai/objection-handler"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function ObjectionHandlerPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">거절 극복 스크립트</h1>
        <p className="text-sm text-gray-500 mt-1">
          고객의 거절 멘트에 맞는 효과적인 대응 스크립트를 AI가 3가지 전략으로 제안합니다
        </p>
      </div>
      <ObjectionHandler planName={planName} limits={limits} usage={usage} />
    </div>
  )
}
