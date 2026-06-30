import { requireAdmin } from '@/lib/auth/permissions'
import { AdminInsuranceCompanies } from '@/components/admin/admin-insurance-companies'

export default async function AdminInsuranceCompaniesPage() {
  const { role } = await requireAdmin()
  return (
    <div className="max-w-5xl">
      <AdminInsuranceCompanies isSuperAdmin={role === 'super_admin'} />
    </div>
  )
}
