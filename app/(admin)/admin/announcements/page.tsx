import { requireAdmin } from '@/lib/auth/permissions'
import { AdminAnnouncements } from '@/components/admin/admin-announcements'

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  return (
    <div className="max-w-4xl">
      <AdminAnnouncements />
    </div>
  )
}
