import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/permissions'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: rows, error } = await (supabase as any)
      .from('safety_checks')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) throw error

    const total = rows.length
    const byRisk = { low: 0, medium: 0, high: 0 }
    const byFeature: Record<string, { total: number; high: number; medium: number }> = {}
    const categoryCount: Record<string, number> = {}

    for (const row of rows) {
      byRisk[row.risk_level as keyof typeof byRisk]++

      const ft = row.feature_type
      if (!byFeature[ft]) byFeature[ft] = { total: 0, high: 0, medium: 0 }
      byFeature[ft].total++
      if (row.risk_level === 'high') byFeature[ft].high++
      if (row.risk_level === 'medium') byFeature[ft].medium++

      const issues = (row.detected_issues ?? []) as Array<{ category: string }>
      for (const issue of issues) {
        categoryCount[issue.category] = (categoryCount[issue.category] ?? 0) + 1
      }
    }

    const recentHigh = (rows as any[])
      .filter(r => r.risk_level === 'high')
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        featureType: r.feature_type,
        riskLevel: r.risk_level,
        issues: r.detected_issues,
        createdAt: r.created_at,
      }))

    return NextResponse.json({
      total,
      byRisk,
      byFeature: Object.entries(byFeature).map(([ft, v]) => ({ featureType: ft, ...v })),
      categoryCount,
      recentHigh,
    })
  } catch (e) {
    console.error('safety-stats error', e)
    return NextResponse.json({ error: '통계 조회 실패' }, { status: 500 })
  }
}
