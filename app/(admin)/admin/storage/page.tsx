import { requireAdmin } from '@/lib/auth/permissions'
import { AdminStorage } from '@/components/admin/admin-storage'

export default async function StoragePage() {
  await requireAdmin()
  return <AdminStorage />
}
