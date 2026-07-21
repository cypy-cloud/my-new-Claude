import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

const MB = 1024 * 1024

function toFileShape(rows: any[]) {
  return (rows ?? []).map((r: any) => ({
    id: r.id,
    file_name: r.original_file_name,
    file_size: Math.round((r.file_size_mb ?? 0) * MB),
    user_id: r.user_id,
    expires_at: r.delete_after,
    created_at: r.created_at,
  }))
}

// GET /api/admin/storage
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 실제 테이블명은 uploaded_files다 — documents 테이블은 존재한 적이 없어
  // 이 라우트가 항상 빈 결과만 반환하고 있었음(2026-07-21 스키마 재검토로 발견).
  const [totalRes, expiredRes, largeRes] = await Promise.all([
    (admin as any)
      .from('uploaded_files')
      .select('id, file_size_mb', { count: 'exact' }),
    (admin as any)
      .from('uploaded_files')
      .select('id, original_file_name, file_size_mb, user_id, delete_after', { count: 'exact' })
      .lte('delete_after', now)
      .order('delete_after', { ascending: true })
      .limit(50),
    (admin as any)
      .from('uploaded_files')
      .select('id, original_file_name, file_size_mb, user_id, created_at')
      .order('file_size_mb', { ascending: false })
      .limit(20),
  ])

  const totalBytes = (totalRes.data ?? []).reduce((sum: number, d: any) => sum + Math.round((d.file_size_mb ?? 0) * MB), 0)

  return NextResponse.json({
    totalFiles: totalRes.count ?? 0,
    totalBytes,
    expiredFiles: toFileShape(expiredRes.data),
    expiredCount: expiredRes.count ?? 0,
    largestFiles: toFileShape(largeRes.data),
  })
}
