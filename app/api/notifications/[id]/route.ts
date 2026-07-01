import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/notifications/[id] — 단건 읽음 처리
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { id } = await params

    await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('notification read error', e)
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }
}
