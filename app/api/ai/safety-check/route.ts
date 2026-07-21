import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkSafety } from '@/lib/safety/safety-checker'

// Vercel 기본 타임아웃(Pro 기준 무설정 시 15초) 방어 (2026-07-21 AI 기능 재검토로 발견)
export const maxDuration = 240

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const { text, outputId, featureType } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '텍스트 필요' }, { status: 400 })
    }

    const { riskLevel, issues } = checkSafety(text)

    const suggestedFixes = issues.map(i => ({
      category: i.category,
      categoryLabel: i.categoryLabel,
      flaggedText: i.flaggedText,
      suggestion: i.suggestion,
    }))

    const { data: saved } = await (supabase as any)
      .from('safety_checks')
      .insert({
        output_id: outputId ?? null,
        feature_type: featureType ?? 'unknown',
        risk_level: riskLevel,
        detected_issues: issues,
        suggested_fixes: suggestedFixes,
        checked_text_len: text.length,
      })
      .select('id')
      .single()

    return NextResponse.json({
      riskLevel,
      issues,
      suggestedFixes,
      savedId: saved?.id ?? null,
    })
  } catch (e) {
    console.error('safety-check error', e)
    return NextResponse.json({ error: '검사 실패' }, { status: 500 })
  }
}
