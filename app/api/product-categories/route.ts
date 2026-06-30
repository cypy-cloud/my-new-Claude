import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 활성 보험상품 카테고리 목록 (로그인 사용자라면 누구나 조회 가능 — AI 입력폼 선택용)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('product_categories')
    .select('id, name, parent_id, description')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ categories: data ?? [] })
}
