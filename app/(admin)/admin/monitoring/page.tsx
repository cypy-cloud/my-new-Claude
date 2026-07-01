import { requireAdmin } from '@/lib/auth/permissions'
import { AdminMonitoring } from '@/components/admin/admin-monitoring'

export default async function MonitoringPage() {
  await requireAdmin()
  return <AdminMonitoring />
}
