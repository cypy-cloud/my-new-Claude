import { createClient } from "@/lib/supabase/server"
import { ScriptGenerator } from "@/components/ai/script-generator"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function AiScriptPage({
  searchParams,
}: {
  searchParams: Promise<{
    customerId?: string
    interactionId?: string
    pension_calc?: string
    current_age?: string
    retire_age?: string
    life_expectancy?: string
    monthly_expense?: string
    current_savings?: string
    monthly_contrib?: string
    return_rate?: string
    inflation_rate?: string
    national_pension?: string
    total_needed?: string
    shortfall?: string
    additional_monthly?: string
    preparedness_rate?: string
  }>
}) {
  const params = await searchParams
  const { customerId, interactionId } = params

  // 연금계산기에서 넘어온 경우 pensionData 구성
  let pensionData: Record<string, string> | undefined
  if (params.pension_calc === "1") {
    pensionData = {
      current_age: params.current_age ?? "",
      retire_age: params.retire_age ?? "",
      life_expectancy: params.life_expectancy ?? "",
      monthly_expense: params.monthly_expense ?? "",
      current_savings: params.current_savings ?? "",
      monthly_contrib: params.monthly_contrib ?? "",
      return_rate: params.return_rate ?? "",
      inflation_rate: params.inflation_rate ?? "",
      national_pension: params.national_pension ?? "",
      total_needed: params.total_needed ?? "",
      shortfall: params.shortfall ?? "",
      additional_monthly: params.additional_monthly ?? "",
      preparedness_rate: params.preparedness_rate ?? "",
    }
  }
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

  let initialData: {
    customerId: string
    customerName: string
    gender?: string
    ageGroup?: string
    occupation?: string
    maritalStatus?: string
    hasChildren?: string
    incomeLevel?: string
    productInterest?: string
    extraNotes?: string
    expectedObjections?: string
  } | undefined
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

  if (interactionId && initialData) {
    const { data: interaction } = await (supabase as any)
      .from("customer_interactions")
      .select("id, content, next_action")
      .eq("id", interactionId)
      .eq("user_id", user!.id)
      .maybeSingle()

    if (interaction) {
      const expectedObjections = [interaction.next_action, interaction.content].filter(Boolean).join(" — ")
      initialData = { ...initialData, expectedObjections }
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
        pensionData={pensionData}
      />
    </div>
  )
}
