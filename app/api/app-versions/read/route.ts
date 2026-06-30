import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { versionId } = await request.json()
  if (!versionId) return NextResponse.json({ error: 'versionId 필요' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('app_version_reads')
    .upsert({ version_id: versionId, user_id: user.id }, { onConflict: 'version_id,user_id' })

  return NextResponse.json({ ok: true })
}
