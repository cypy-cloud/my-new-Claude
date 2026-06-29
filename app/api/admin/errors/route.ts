import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { markErrorResolved } from '@/lib/errors/logger'

export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()
  const sp = request.nextUrl.searchParams
  const area = sp.get('area') ?? ''
  const severity = sp.get('severity') ?? ''
  const resolved = sp.get('resolved') ?? ''
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('error_logs')
    .select('id, user_id, area, error_message, severity, resolved, resolved_at, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (area) query = query.eq('area', area)
  if (severity) query = query.eq('severity', severity)
  if (resolved === 'true') query = query.eq('resolved', true)
  if (resolved === 'false') query = query.eq('resolved', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  // 에러 건수 집계
  const { data: counts } = await (supabase as any)
    .from('error_logs')
    .select('severity, resolved')

  const summary = { total: 0, unresolved: 0, critical: 0, high: 0, medium: 0, low: 0 }
  for (const row of (counts ?? [])) {
    summary.total++
    if (!row.resolved) summary.unresolved++
    if (row.severity === 'critical') summary.critical++
    else if (row.severity === 'high') summary.high++
    else if (row.severity === 'medium') summary.medium++
    else if (row.severity === 'low') summary.low++
  }

  return NextResponse.json({ errors: data ?? [], summary })
}

// GET /api/admin/errors/[id] — 상세 조회 (stack_trace 포함)
export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { action, errorId } = body as { action: string; errorId: string }

  if (action === 'resolve') {
    const ok = await markErrorResolved(errorId, guard.ctx.userId)
    if (!ok) return NextResponse.json({ error: '처리 실패' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'detail') {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('error_logs')
      .select('*')
      .eq('id', errorId)
      .single()

    if (error || !data) return NextResponse.json({ error: '조회 실패' }, { status: 404 })
    return NextResponse.json({ error: data })
  }

  return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 })
}
