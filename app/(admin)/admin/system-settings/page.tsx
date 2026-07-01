import { requireAdmin } from '@/lib/auth/permissions'
import { AdminSystemSettings } from '@/components/admin/admin-system-settings'
import type { UserRole } from '@/lib/auth/permissions'

export default async function SystemSettingsPage() {
  const { role } = await requireAdmin()
  return <AdminSystemSettings callerRole={role as UserRole} />
}
