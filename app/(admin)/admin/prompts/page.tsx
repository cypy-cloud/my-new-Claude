import { requireAdmin } from '@/lib/auth/permissions'
import { AdminPrompts } from '@/components/admin/admin-prompts'

export default async function AdminPromptsPage() {
  const { role } = await requireAdmin()
  return (
    <div className="max-w-5xl">
      <AdminPrompts isSuperAdmin={role === 'super_admin'} />
    </div>
  )
}
