import { requireAdmin } from '@/lib/auth/permissions'
import { AdminSafetyStats } from '@/components/admin/admin-safety-stats'

export default async function SafetyStatsPage() {
  await requireAdmin()
  return <AdminSafetyStats />
}
