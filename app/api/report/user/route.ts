import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const months = parseInt(sp.get('months') ?? '1') // 1 or 3 or 6
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toISOString()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const uid = user.id

  // 1. 이번 달 기능별 생성 횟수
  const { data: monthRequests } = await (supabase as any)
    .from('ai_requests')
    .select('feature_type, status, estimated_cost')
    .eq('user_id', uid)
    .gte('created_at', thisMonthStart)

  const featureMap: Record<string, number> = {}
  let monthTotal = 0
  let monthCost = 0
  for (const r of monthRequests ?? []) {
    if (r.status === 'success' || r.status === 'cached') {
      featureMap[r.feature_type] = (featureMap[r.feature_type] ?? 0) + 1
      monthTotal++
      monthCost += r.estimated_cost ?? 0
    }
  }

  // 가장 많이 사용한 기능
  const topFeature = Object.entries(featureMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const FEATURE_LABELS: Record<string, string> = {
    ai_message: 'AI 문자/카톡',
    ai_script: 'AI 상담 스크립트',
    ai_document: 'AI PDF 분석',
    sms_message: 'AI 문자/카톡',
    sales_script: 'AI 상담 스크립트',
    pdf_explanation: 'AI PDF 분석',
  }

  // 2. 저장한 결과물 수
  const { count: savedOutputs } = await (supabase as any)
    .from('generated_outputs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid)

  // 3. 고객별 상담 이력 수 (상위 5개 고객)
  const { data: interactions } = await (supabase as any)
    .from('customer_interactions')
    .select('customer_id, customers(name)')
    .eq('user_id', uid)

  const customerMap: Record<string, { name: string; count: number }> = {}
  for (const i of interactions ?? []) {
    const cid = i.customer_id
    if (!customerMap[cid]) {
      customerMap[cid] = { name: i.customers?.name ?? '알 수 없음', count: 0 }
    }
    customerMap[cid].count++
  }
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 4. 다운로드 횟수 (event_logs)
  const { count: downloadCount } = await (supabase as any)
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('event_name', 'download')

  // 5. 기간별 월별 생성 추이
  const { data: periodRequests } = await (supabase as any)
    .from('ai_requests')
    .select('feature_type, created_at, estimated_cost, status')
    .eq('user_id', uid)
    .gte('created_at', periodStart)
    .order('created_at', { ascending: true })

  const monthlyMap: Record<string, Record<string, number>> = {}
  for (const r of periodRequests ?? []) {
    if (r.status !== 'success' && r.status !== 'cached') continue
    const month = r.created_at.slice(0, 7) // YYYY-MM
    if (!monthlyMap[month]) monthlyMap[month] = {}
    const ft = FEATURE_LABELS[r.feature_type] ?? r.feature_type
    monthlyMap[month][ft] = (monthlyMap[month][ft] ?? 0) + 1
  }

  const monthlyTrend = Object.entries(monthlyMap).map(([month, counts]) => ({
    month,
    ...counts,
    total: Object.values(counts).reduce((s, v) => s + v, 0),
  }))

  // 6. 기능별 전체 사용 횟수 (기간 내)
  const featureUsage = Object.entries(
    (periodRequests ?? []).reduce((acc: Record<string, number>, r: any) => {
      if (r.status !== 'success' && r.status !== 'cached') return acc
      const label = FEATURE_LABELS[r.feature_type] ?? r.feature_type
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})
  ).map(([feature, count]) => ({ feature, count: count as number }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    monthTotal,
    topFeature: topFeature ? (FEATURE_LABELS[topFeature] ?? topFeature) : null,
    featureMap: Object.fromEntries(
      Object.entries(featureMap).map(([k, v]) => [FEATURE_LABELS[k] ?? k, v])
    ),
    savedOutputs: savedOutputs ?? 0,
    topCustomers,
    downloadCount: downloadCount ?? 0,
    monthlyTrend,
    featureUsage,
  })
}
