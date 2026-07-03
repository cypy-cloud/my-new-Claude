import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TossCheckout } from "@/components/billing/toss-checkout"
import { PLANS, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

const VALID_PLANS: PlanId[] = ["basic", "pro", "premium"]

export default async function TossCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; orderId?: string }>
}) {
  const { planId, orderId } = await searchParams

  if (!planId || !VALID_PLANS.includes(planId as PlanId) || !orderId) {
    redirect("/billing")
  }

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
  if (!clientKey) redirect("/billing")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminSupabase = createAdminClient()
  const { data: profile } = await (adminSupabase as any)
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .single()

  if (profile?.plan_type === planId) redirect("/billing")

  const plan = PLANS[planId as PlanId]
  // customerKey: Toss 정기결제용 고객 고유키 (UUID 기반)
  const customerKey = `fp_${user.id.replace(/-/g, "").slice(0, 20)}`

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1e3a5f]">
          {PLAN_LABELS[planId as PlanId]} 플랜 결제
        </h1>
        <p className="text-sm text-gray-500 mt-1">아래에서 결제 수단을 선택해 주세요</p>
      </div>

      <TossCheckout
        planId={planId as PlanId}
        orderId={orderId}
        customerKey={customerKey}
        clientKey={clientKey!}
      />
    </div>
  )
}
