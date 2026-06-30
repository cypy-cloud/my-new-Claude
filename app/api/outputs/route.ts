import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/outputs — list all outputs (with optional type/search/sort filters)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const type = sp.get('type')
  const search = sp.get('search')
  const favorite = sp.get('favorite')
  const limit = parseInt(sp.get('limit') ?? '100')

  let query = (supabase as any)
    .from('generated_outputs')
    .select('id, type, title, output_text, ai_provider, model, is_favorite, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type && type !== 'all') query = query.eq('type', type)
  if (favorite === 'true') query = query.eq('is_favorite', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })

  // Client-side search filter (simple contains)
  let results = data ?? []
  if (search) {
    const q = search.toLowerCase()
    results = results.filter((r: { title: string; output_text: string }) =>
      r.title.toLowerCase().includes(q) || r.output_text.toLowerCase().includes(q)
    )
  }

  return NextResponse.json({ outputs: results })
}

// POST /api/outputs — create new output
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { type, title, inputData, outputText, promptVersion, aiProvider, model } = body

  if (!type || !title || !outputText) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('generated_outputs')
    .insert({
      user_id: user.id,
      type,
      title,
      input_data: inputData ?? {},
      output_text: outputText,
      prompt_version: promptVersion ?? null,
      ai_provider: aiProvider ?? null,
      model: model ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })

  return NextResponse.json({ id: data.id })
}

// PATCH /api/outputs — update title or favorite
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { id, isFavorite, title } = body

  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (isFavorite !== undefined) updates.is_favorite = isFavorite
  if (title !== undefined) updates.title = title

  const { error } = await (supabase as any)
    .from('generated_outputs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: '업데이트에 실패했습니다' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/outputs?id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  const { error } = await (supabase as any)
    .from('generated_outputs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
