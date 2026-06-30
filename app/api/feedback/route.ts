import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors/api-error-handler'
import type { FeedbackCategory } from '@/types'

const CATEGORIES: FeedbackCategory[] = ['bug', 'feature_request', 'improvement', 'billing', 'other']

// GET: 내가 보낸 피드백 목록
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 100)

  const { data, error } = await (supabase as any)
    .from('feedback')
    .select('id, category, title, content, status, priority, admin_memo, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ feedback: data ?? [] })
}

// POST: 피드백 작성
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    const body = await request.json()
    const { category, title, content } = body

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: '카테고리를 선택해주세요' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('feedback')
      .insert({
        user_id: user.id,
        category,
        title: title?.trim() || null,
        content: content.trim(),
      })
      .select('id, category, title, content, status, priority, created_at, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json({ feedback: data })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'unknown', metadata: { feature: 'feedback' } })
  }
}
