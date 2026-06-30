import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors/api-error-handler'

const INTERACTION_COLUMNS =
  'id, customer_id, interaction_type, title, content, next_action, next_action_date, sentiment, created_at, updated_at'

const INTERACTION_TYPES = ['call', 'meeting', 'kakao', 'sms', 'contract', 'followup', 'memo']
const SENTIMENTS = ['positive', 'neutral', 'negative', 'unknown']

// GET /api/customers/[id]/interactions — list a customer's interaction history (newest first)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: customer } = await (supabase as any)
    .from('customers')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!customer) return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })

  const { data, error } = await (supabase as any)
    .from('customer_interactions')
    .select(INTERACTION_COLUMNS)
    .eq('customer_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'interactions_list' } })

  return NextResponse.json({ interactions: data ?? [] })
}

// POST /api/customers/[id]/interactions — log a new interaction
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: customer } = await (supabase as any)
    .from('customers')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!customer) return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })

  const body = await request.json()
  const { interactionType, title, content, nextAction, nextActionDate, sentiment } = body

  if (!interactionType || !INTERACTION_TYPES.includes(interactionType)) {
    return NextResponse.json({ error: '올바르지 않은 상담 유형입니다' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 })
  }
  if (sentiment && !SENTIMENTS.includes(sentiment)) {
    return NextResponse.json({ error: '올바르지 않은 반응 평가입니다' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('customer_interactions')
    .insert({
      user_id: user.id,
      customer_id: id,
      interaction_type: interactionType,
      title: title.trim(),
      content: content?.trim() || null,
      next_action: nextAction?.trim() || null,
      next_action_date: nextActionDate || null,
      sentiment: sentiment || 'unknown',
    })
    .select(INTERACTION_COLUMNS)
    .single()

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'interactions_create' } })

  return NextResponse.json({ interaction: data })
}
