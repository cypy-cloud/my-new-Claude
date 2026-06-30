import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FollowupRecommender } from "@/components/ai/followup-recommender"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/types"

export default async function AiFollowupPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const { customerId } = await searchParams
  if (!customerId) redirect("/customers")

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

  const { data: customer } = await (supabase as any)
    .from("customers")
    .select("id, name, status, interest_products")
    .eq("id", customerId)
    .eq("user_id", user!.id)
    .maybeSingle()

  if (!customer) redirect("/customers")

  const { data: interactions } = await (supabase as any)
    .from("customer_interactions")
    .select("id, interaction_type, title, content, next_action, next_action_date, sentiment, created_at")
    .eq("customer_id", customerId)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const customerInfo = {
    id: customer.id,
    name: customer.name,
    statusLabel: CUSTOMER_STATUS_LABELS[customer.status as CustomerStatus] ?? customer.status,
    interestProducts: Array.isArray(customer.interest_products) ? customer.interest_products : [],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 후속 연락 추천</h1>
        <p className="text-gray-600 mt-1">상담 이력과 고객 상태를 바탕으로 다음 연락 메시지와 상담 전략을 추천합니다</p>
      </div>

      <FollowupRecommender
        initialUsage={usage.followupCount}
        limit={limits.followupLimit}
        planName={planName}
        customer={customerInfo}
        interactions={interactions ?? []}
      />
    </div>
  )
}
