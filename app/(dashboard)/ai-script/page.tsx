import { createClient } from "@/lib/supabase/server"
import { ScriptGenerator } from "@/components/ai/script-generator"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function AiScriptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("plan_type")
    .eq("user_id", user!.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? "free"
  const planName = PLAN_LABELS[planId]
  const limits = getPlanLimits(planId)
  const usage = await getMonthlyUsage(user!.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 상담 스크립트 생성기</h1>
        <p className="text-gray-600 mt-1">고객 정보를 입력하면 실전에서 바로 쓸 수 있는 상담 스크립트 10개 섹션을 즉시 생성합니다</p>
      </div>

      <ScriptGenerator
        initialUsage={usage.scriptCount}
        limit={limits.scriptLimit}
        planName={planName}
      />
    </div>
  )
}
