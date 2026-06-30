import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors/api-error-handler'

const INTERACTION_COLUMNS =
  'id, customer_id, interaction_type, title, content, next_action, next_action_date, sentiment, created_at, updated_at'

const INTERACTION_TYPES = ['call', 'meeting', 'kakao', 'sms', 'contract', 'followup', 'memo']
const SENTIMENTS = ['positive', 'neutral', 'negative', 'unknown']

// GET /api/interactions/[id] — single interaction (used to prefill AI generators)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('customer_interactions')
    .select(INTERACTION_COLUMNS)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'interaction_detail' } })
  if (!data) return NextResponse.json({ error: '상담 이력을 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ interaction: data })
}

// PATCH /api/interactions/[id] — update an interaction (e.g. mark next action done)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { interactionType, title, content, nextAction, nextActionDate, sentiment } = body

  if (interactionType && !INTERACTION_TYPES.includes(interactionType)) {
    return NextResponse.json({ error: '올바르지 않은 상담 유형입니다' }, { status: 400 })
  }
  if (sentiment && !SENTIMENTS.includes(sentiment)) {
    return NextResponse.json({ error: '올바르지 않은 반응 평가입니다' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (interactionType !== undefined) update.interaction_type = interactionType
  if (typeof title === 'string') {
    if (!title.trim()) return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 })
    update.title = title.trim()
  }
  if (content !== undefined) update.content = content?.trim() || null
  if (nextAction !== undefined) update.next_action = nextAction?.trim() || null
  if (nextActionDate !== undefined) update.next_action_date = nextActionDate || null
  if (sentiment !== undefined) update.sentiment = sentiment

  const { data, error } = await (supabase as any)
    .from('customer_interactions')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(INTERACTION_COLUMNS)
    .maybeSingle()

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'interaction_update' } })
  if (!data) return NextResponse.json({ error: '상담 이력을 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ interaction: data })
}

// DELETE /api/interactions/[id] — delete an interaction
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { error } = await (supabase as any)
    .from('customer_interactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'interaction_delete' } })

  return NextResponse.json({ ok: true })
}
