import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/ratings — 평가 제출
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await request.json()
  const { outputId, featureType, promptVersion, rating, isHelpful, feedbackText, issueType } = body as {
    outputId?: string
    featureType: string
    promptVersion?: string
    rating: number
    isHelpful?: boolean
    feedbackText?: string
    issueType?: string
  }

  if (!featureType || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: '유효하지 않은 요청' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('ai_output_ratings')
    .insert({
      user_id: user.id,
      output_id: outputId ?? null,
      feature_type: featureType,
      prompt_version: promptVersion ?? null,
      rating,
      is_helpful: isHelpful ?? null,
      feedback_text: feedbackText ?? null,
      issue_type: issueType ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '평가 저장 실패' }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

// GET /api/ratings?outputId=xxx — 내 평가 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const outputId = request.nextUrl.searchParams.get('outputId')
  const featureType = request.nextUrl.searchParams.get('featureType')

  let query = (supabase as any)
    .from('ai_output_ratings')
    .select('id, rating, is_helpful, feedback_text, issue_type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (outputId) query = query.eq('output_id', outputId)
  else if (featureType) query = query.eq('feature_type', featureType)

  const { data } = await query
  return NextResponse.json({ rating: data?.[0] ?? null })
}
