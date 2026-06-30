import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CustomerForm } from "@/components/customers/customer-form"
import type { Customer } from "@/types"

const CUSTOMER_COLUMNS =
  "id, name, phone, age_group, gender, job, relationship_type, family_status, children_status, income_level, interest_products, memo, tags, status, created_at, updated_at"

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
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
        <h1 className="text-2xl font-bold text-gray-900">고객 정보 수정</h1>
      </div>
      <CustomerForm customer={customer as Customer} />
    </div>
  )
}
