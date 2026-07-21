import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TASK_SELECT = `
  id, user_id, customer_id, title, description,
  task_type, due_date, due_time, status, priority,
  notify_before_minutes, gcal_event_id, created_at, updated_at,
  customers(id, name, phone)
`

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const allowed = ['title', 'description', 'task_type', 'due_date', 'due_time', 'status', 'priority', 'customer_id', 'notify_before_minutes']
  // customer_id는 uuid 컬럼이라 빈 문자열("고객 미연결")을 그대로 보내면 DB가 거부한다 —
  // 생성(POST) 흐름과 동일하게 빈 문자열은 null로 정규화한다.
  const nullableIfEmpty = new Set(['customer_id', 'due_time', 'description'])
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      const value = body[key]
      updates[key] = nullableIfEmpty.has(key) && value === '' ? null : value
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(TASK_SELECT)
    .single()

  if (error) {
    console.error('[tasks/[id]]', error)
    return NextResponse.json({ error: '일정 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }
  return NextResponse.json({ task: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { error } = await (supabase as any)
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[tasks/[id]]', error)
    return NextResponse.json({ error: '일정 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
