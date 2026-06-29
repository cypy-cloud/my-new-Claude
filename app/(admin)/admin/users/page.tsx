import { requireAdmin } from "@/lib/auth/permissions"
import { AdminUsersClient } from "@/components/admin/admin-users-client"

export default async function AdminUsersPage() {
  const { role } = await requireAdmin()
  return <AdminUsersClient callerRole={role} />
}
