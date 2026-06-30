import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sp = request.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') ?? '20'), 50)

  const { data, error } = await (supabase as any)
    .from('app_versions')
    .select('id, version, title, description, changes, release_date, is_current, created_at')
    .order('release_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  let readIds = new Set<string>()
  if (user) {
    const { data: reads } = await (supabase as any)
      .from('app_version_reads')
      .select('version_id')
      .eq('user_id', user.id)
      .in('version_id', (data ?? []).map((v: { id: string }) => v.id))

    readIds = new Set((reads ?? []).map((r: { version_id: string }) => r.version_id))
  }

  const result = (data ?? []).map((v: { id: string }) => ({
    ...v,
    isRead: readIds.has(v.id),
  }))

  return NextResponse.json({ versions: result })
}
