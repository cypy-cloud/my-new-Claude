import { createClient } from "@/lib/supabase/server"
import { ScriptGenerator } from "@/components/ai/script-generator"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function AiScriptPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const { customerId } = await searchParams
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

  let initialData
  if (customerId) {
    const { data: customer } = await (supabase as any)
      .from("customers")
      .select("id, name, gender, age_group, job, family_status, children_status, income_level, interest_products, memo")
      .eq("id", customerId)
      .eq("user_id", user!.id)
      .maybeSingle()

    if (customer) {
      initialData = {
        customerId: customer.id,
        customerName: customer.name,
        gender: customer.gender ?? undefined,
        ageGroup: customer.age_group ?? undefined,
        occupation: customer.job ?? undefined,
        maritalStatus: customer.family_status ?? undefined,
        hasChildren: customer.children_status ?? undefined,
        incomeLevel: customer.income_level ?? undefined,
        productInterest: Array.isArray(customer.interest_products) ? customer.interest_products[0] : undefined,
        extraNotes: customer.memo ?? undefined,
      }
    }
  }

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
        initialData={initialData}
      />
    </div>
  )
}
