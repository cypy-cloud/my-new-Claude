import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { announcementId } = await request.json()
  if (!announcementId) return NextResponse.json({ error: 'announcementId 필요' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, user_id: user.id }, { onConflict: 'announcement_id,user_id' })

  return NextResponse.json({ ok: true })
}

// DELETE: 읽음 취소 (테스트용)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('announcement_reads')
    .delete()
    .eq('announcement_id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
