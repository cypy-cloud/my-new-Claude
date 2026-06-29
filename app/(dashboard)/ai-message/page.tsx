import { createClient } from "@/lib/supabase/server"
import { MessageGenerator } from "@/components/ai/message-generator"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function AiMessagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <h1 className="text-2xl font-bold text-gray-900">AI 문자/카톡 생성기</h1>
        <p className="text-gray-600 mt-1">고객 정보를 입력하면 AI가 5가지 버전의 메시지를 즉시 작성해드립니다</p>
      </div>

      <MessageGenerator
        initialUsage={usage.smsCount}
        limit={limits.smsLimit}
        planName={planName}
      />
    </div>
  )
}
