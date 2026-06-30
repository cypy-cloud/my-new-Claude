import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('subscription_events')
    .select('id, event_type, from_plan, to_plan, amount, provider, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}
