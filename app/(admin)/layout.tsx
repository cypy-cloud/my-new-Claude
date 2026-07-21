import { requireAdmin } from '@/lib/auth/permissions'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // requireAdmin: admin 미만이면 /dashboard 로 redirect
  const { role } = await requireAdmin()

  return <AdminShell role={role}>{children}</AdminShell>
}
