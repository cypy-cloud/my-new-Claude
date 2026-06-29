import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { type, title, inputData, outputText, promptVersion, aiProvider, model } = body

  if (!type || !title || !outputText) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (error) {
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { id, isFavorite } = body

  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('generated_outputs')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: '업데이트에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
