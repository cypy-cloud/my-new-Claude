import { requireAdmin } from '@/lib/auth/permissions'
import { AdminAiLogs } from '@/components/admin/admin-ai-logs'

export default async function AiLogsPage() {
  await requireAdmin()
  return <AdminAiLogs />
}
