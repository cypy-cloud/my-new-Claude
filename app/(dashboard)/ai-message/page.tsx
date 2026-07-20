import { createClient } from "@/lib/supabase/server"
import { MessageGenerator } from "@/components/ai/message-generator"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function AiMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; interactionId?: string }>
}) {
  const { customerId, interactionId } = await searchParams
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
    ageGroup?: string
    occupation?: string
    relationship?: string
    productField?: string
    extraNotes?: string
    contactType?: "customer" | "recruit"
    mbtiType?: string
  } | undefined
  if (customerId) {
    const { data: customer } = await (supabase as any)
      .from("customers")
      .select("id, name, age_group, job, relationship_type, interest_products, contact_type, mbti_type")
      .eq("id", customerId)
      .eq("user_id", user!.id)
      .maybeSingle()

    if (customer) {
      initialData = {
        customerId: customer.id,
        customerName: customer.name,
        ageGroup: customer.age_group ?? undefined,
        occupation: customer.job ?? undefined,
        relationship: customer.relationship_type ?? undefined,
        productField: customer.contact_type === "recruit"
          ? undefined
          : (Array.isArray(customer.interest_products) ? customer.interest_products[0] : undefined),
        contactType: customer.contact_type === "recruit" ? "recruit" : "customer",
        mbtiType: customer.mbti_type ?? undefined,
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
      const extraNotes = [interaction.next_action, interaction.content].filter(Boolean).join(" — ")
      initialData = { ...initialData, extraNotes }
    }
  }

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
        initialData={initialData}
      />
    </div>
  )
}
