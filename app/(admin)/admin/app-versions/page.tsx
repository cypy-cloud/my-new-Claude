import { requireAdmin } from '@/lib/auth/permissions'
import { AdminAppVersions } from '@/components/admin/admin-app-versions'

export default async function AdminAppVersionsPage() {
  await requireAdmin()
  return (
    <div className="max-w-4xl">
      <AdminAppVersions />
    </div>
  )
}
