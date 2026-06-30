import { requireAdmin } from '@/lib/auth/permissions'
import { AdminProductCategories } from '@/components/admin/admin-product-categories'

export default async function AdminProductCategoriesPage() {
  const { role } = await requireAdmin()
  return (
    <div className="max-w-5xl">
      <AdminProductCategories isSuperAdmin={role === 'super_admin'} />
    </div>
  )
}
