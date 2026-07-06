import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TossCreditsCheckout } from "@/components/billing/toss-credits-checkout"
import { VALID_PACK_MAP } from "@/lib/billing/credit-packs"
import type { PlanId } from "@/lib/subscription/plans"

const PAID_PLANS: PlanId[] = ['basic', 'pro', 'premium']

export default async function CreditsCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; amount?: string; packSize?: string }>
}) {
  const { orderId, amount: amountStr, packSize: packSizeStr } = await searchParams

  const amount = Number(amountStr ?? 0)
  const packSize = Number(packSizeStr ?? 0)

  // 유효한 팩인지 검증
  if (!orderId || !packSize || VALID_PACK_MAP[packSize] !== amount) {
    redirect("/billing")
  }

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
  if (!clientKey) redirect("/billing")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 유료 플랜 여부 확인
  const adminSupabase = createAdminClient()
  const { data: profile } = await (adminSupabase as any)
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  if (!PAID_PLANS.includes(planId)) {
    redirect("/billing")
  }

  const customerKey = `fp_${user.id.replace(/-/g, "").slice(0, 20)}`

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1e3a5f]">추가 크레딧 구매</h1>
        <p className="text-sm text-gray-500 mt-1">한도 초과 후에도 계속 이용할 수 있습니다</p>
      </div>

      <TossCreditsCheckout
        orderId={orderId}
        packSize={packSize}
        amount={amount}
        customerKey={customerKey}
        clientKey={clientKey!}
      />
    </div>
  )
}
