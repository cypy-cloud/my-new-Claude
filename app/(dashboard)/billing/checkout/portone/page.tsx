import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PortOneCheckout } from "@/components/billing/portone-checkout"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

const VALID_PLANS: PlanId[] = ["basic", "pro", "premium"]

export default async function PortOneCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; paymentId?: string }>
}) {
  const { planId, paymentId } = await searchParams

  if (!planId || !VALID_PLANS.includes(planId as PlanId) || !paymentId) {
    redirect("/billing")
  }

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
  if (!storeId || !channelKey) redirect("/billing")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminSupabase = createAdminClient()
  const { data: profile } = await (adminSupabase as any)
    .from("profiles")
    .select("plan_type, full_name, phone, email")
    .eq("id", user.id)
    .single()

  if (profile?.plan_type === planId) redirect("/billing")

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1e3a5f]">
          {PLAN_LABELS[planId as PlanId]} 플랜 결제 (월간)
        </h1>
        <p className="text-sm text-gray-500 mt-1">아래에서 결제를 진행해 주세요</p>
      </div>

      <PortOneCheckout
        planId={planId as PlanId}
        paymentId={paymentId}
        storeId={storeId}
        channelKey={channelKey}
        fullName={profile?.full_name ?? "이용자"}
        phoneNumber={profile?.phone}
        email={profile?.email}
      />
    </div>
  )
}
