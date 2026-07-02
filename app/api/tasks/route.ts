import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TASK_SELECT = `
  id, user_id, customer_id, title, description,
  task_type, due_date, due_time, status, priority,
  gcal_event_id, created_at, updated_at,
  customers(id, name, phone)
`

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')         // pending | completed | canceled
  const from = sp.get('from')             // YYYY-MM-DD
  const to = sp.get('to')                 // YYYY-MM-DD
  const customerId = sp.get('customer_id')
  const taskType = sp.get('task_type')

  let query = (supabase as any)
    .from('tasks')
    .select(TASK_SELECT)
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })
    .order('priority', { ascending: false })

  if (status) query = query.eq('status', status)
  if (from)   query = query.gte('due_date', from)
  if (to)     query = query.lte('due_date', to)
  if (customerId) query = query.eq('customer_id', customerId)
  if (taskType)   query = query.eq('task_type', taskType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { title, description, task_type, due_date, due_time, priority, customer_id } = body

  if (!title?.trim() || !due_date || !task_type) {
    return NextResponse.json({ error: '제목, 마감일, 업무 유형을 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert({
      user_id: user.id,
      customer_id: customer_id || null,
      title: title.trim(),
      description: description || null,
      task_type,
      due_date,
      due_time: due_time || null,
      priority: priority || 'medium',
      status: 'pending',
    })
    .select(TASK_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}
