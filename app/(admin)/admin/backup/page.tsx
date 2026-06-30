import { requireAdmin } from '@/lib/auth/permissions'
import { AdminBackup } from '@/components/admin/admin-backup'

export default async function AdminBackupPage() {
  await requireAdmin()
  return (
    <div className="max-w-5xl">
      <AdminBackup />
    </div>
  )
}
