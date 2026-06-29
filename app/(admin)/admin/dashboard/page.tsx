import { requireAdmin } from "@/lib/auth/permissions"
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client"

export default async function AdminDashboardPage() {
  const { role } = await requireAdmin()
  return <AdminDashboardClient role={role} />
}
