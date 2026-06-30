import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CustomerDetail } from "@/components/customers/customer-detail"
import type { Customer } from "@/types"

const CUSTOMER_COLUMNS =
  "id, name, phone, age_group, gender, job, relationship_type, family_status, children_status, income_level, interest_products, memo, tags, status, created_at, updated_at"

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: customer } = await (supabase as any)
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!customer) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">고객 상세</h1>
      </div>
      <CustomerDetail customer={customer as Customer} />
    </div>
  )
}
