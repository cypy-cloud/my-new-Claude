import { requireAdmin } from '@/lib/auth/permissions'
import { AdminFeedback } from '@/components/admin/admin-feedback'

export default async function AdminFeedbackPage() {
  await requireAdmin()
  return (
    <div className="max-w-4xl">
      <AdminFeedback />
    </div>
  )
}
