import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 내 알림 목록
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '30'), 50)
    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true'

    let query = (supabase as any)
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) query = query.eq('is_read', false)

    const { data, error } = await query
    if (error) throw error

    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({ notifications: data ?? [], unreadCount: count ?? 0 })
  } catch (e) {
    console.error('notifications GET error', e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

// PATCH: 전체 읽음 처리
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    if (body.action === 'read-all') {
      await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  } catch (e) {
    console.error('notifications PATCH error', e)
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }
}
