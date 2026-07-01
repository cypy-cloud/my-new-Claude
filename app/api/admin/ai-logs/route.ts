import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET /api/admin/ai-logs
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const sp = request.nextUrl.searchParams
  const userId = sp.get('userId') ?? ''
  const feature = sp.get('feature') ?? ''
  const status = sp.get('status') ?? ''
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 200)
  const offset = parseInt(sp.get('offset') ?? '0')

  const admin = createAdminClient()

  let query = (admin as any)
    .from('ai_requests')
    .select('id, user_id, feature_type, status, input_tokens, output_tokens, estimated_cost, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) query = query.eq('user_id', userId)
  if (feature) query = query.eq('feature_type', feature)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
