import { requireAdmin } from '@/lib/auth/permissions'
import { AdminAiQuality } from '@/components/admin/admin-ai-quality'

export default async function AiQualityPage() {
  await requireAdmin()
  return <AdminAiQuality />
}
