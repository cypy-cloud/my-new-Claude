import { requireAdmin } from "@/lib/auth/permissions"
import { AdminErrorLogs } from "@/components/admin/admin-error-logs"

export default async function AdminErrorsPage() {
  await requireAdmin()
  return (
    <div className="max-w-5xl">
      <AdminErrorLogs />
    </div>
  )
}
