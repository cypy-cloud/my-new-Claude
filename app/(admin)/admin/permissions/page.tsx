import { requireSuperAdmin } from "@/lib/auth/permissions"
import { AdminPermissionsClient } from "@/components/admin/admin-permissions-client"

export default async function AdminPermissionsPage() {
  await requireSuperAdmin()
  return <AdminPermissionsClient />
}
