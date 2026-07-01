import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET /api/admin/storage
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const [totalRes, expiredRes, largeRes] = await Promise.all([
    (admin as any)
      .from('documents')
      .select('id, file_size', { count: 'exact' }),
    (admin as any)
      .from('documents')
      .select('id, file_name, file_size, user_id, expires_at', { count: 'exact' })
      .lte('expires_at', now)
      .order('expires_at', { ascending: true })
      .limit(50),
    (admin as any)
      .from('documents')
      .select('id, file_name, file_size, user_id, created_at')
      .order('file_size', { ascending: false })
      .limit(20),
  ])

  const totalBytes = (totalRes.data ?? []).reduce((sum: number, d: any) => sum + (d.file_size ?? 0), 0)

  return NextResponse.json({
    totalFiles: totalRes.count ?? 0,
    totalBytes,
    expiredFiles: expiredRes.data ?? [],
    expiredCount: expiredRes.count ?? 0,
    largestFiles: largeRes.data ?? [],
  })
}
