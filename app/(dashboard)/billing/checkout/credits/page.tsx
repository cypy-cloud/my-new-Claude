import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PortOneCreditsCheckout } from "@/components/billing/portone-credits-checkout"
import { VALID_PACK_MAP } from "@/lib/billing/credit-packs"
import type { PlanId } from "@/lib/subscription/plans"

const PAID_PLANS: PlanId[] = ['basic', 'pro', 'premium']

export default async function CreditsCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string; amount?: string; packSize?: string }>
}) {
  const { paymentId, amount: amountStr, packSize: packSizeStr } = await searchParams

  const amount = Number(amountStr ?? 0)
  const packSize = Number(packSizeStr ?? 0)

  // 유효한 팩인지 검증
  if (!paymentId || !packSize || VALID_PACK_MAP[packSize] !== amount) {
    redirect("/billing")
  }

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
  if (!storeId || !channelKey) redirect("/billing")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 유료 플랜 여부 확인
  const adminSupabase = createAdminClient()
  const { data: profile } = await (adminSupabase as any)
    .from("profiles")
    .select("plan_type, name, phone, email")
    .eq("id", user.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  if (!PAID_PLANS.includes(planId)) {
    redirect("/billing")
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1e3a5f]">추가 크레딧 구매</h1>
        <p className="text-sm text-gray-500 mt-1">한도 초과 후에도 계속 이용할 수 있습니다</p>
      </div>

      <PortOneCreditsCheckout
        paymentId={paymentId}
        packSize={packSize}
        amount={amount}
        storeId={storeId}
        channelKey={channelKey}
        fullName={profile?.name ?? "이용자"}
        phoneNumber={profile?.phone}
        email={profile?.email}
      />
    </div>
  )
}
