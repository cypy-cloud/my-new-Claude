import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TossCreditsCheckout } from "@/components/billing/toss-credits-checkout"

const PACK_SIZE = 10
const PACK_PRICE = 2000

export default async function CreditsCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; amount?: string; packSize?: string }>
}) {
  const { orderId, amount: amountStr, packSize: packSizeStr } = await searchParams

  const amount = Number(amountStr ?? PACK_PRICE)
  const packSize = Number(packSizeStr ?? PACK_SIZE)

  if (!orderId || amount !== PACK_PRICE || packSize !== PACK_SIZE) {
    redirect("/billing")
  }

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
  if (!clientKey) redirect("/billing")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

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
