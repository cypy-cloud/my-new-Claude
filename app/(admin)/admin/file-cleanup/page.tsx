import { requireAdmin } from '@/lib/auth/permissions'
import { AdminFileCleanup } from '@/components/admin/admin-file-cleanup'

export default async function AdminFileCleanupPage() {
  await requireAdmin()
  return (
    <div className="max-w-5xl">
      <AdminFileCleanup />
    </div>
  )
}
