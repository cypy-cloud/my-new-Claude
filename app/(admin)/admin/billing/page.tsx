import { requireAdmin } from "@/lib/auth/permissions"
import { AdminBilling } from "@/components/admin/admin-billing"

export default async function AdminBillingPage() {
  await requireAdmin()
  return (
    <div className="space-y-6">
      <AdminBilling />
    </div>
  )
}
