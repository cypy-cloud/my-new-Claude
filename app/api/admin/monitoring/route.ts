import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/permissions'

export async function GET() {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 병렬 조회
    const [
      aiRequestsRes,
      errorLogsRes,
      uploadedFilesRes,
      profilesRes,
      aiCacheRes,
      requestLocksRes,
      usageRes,
    ] = await Promise.all([
      // 오늘 AI 요청 전체
      supabase.from('ai_requests').select('status, estimated_cost').gte('created_at', todayStart),
      // 미해결 에러 (오늘)
      supabase.from('error_logs').select('severity, area').eq('resolved', false).gte('created_at', todayStart),
      // 오늘 파일 업로드
      supabase.from('uploaded_files').select('status, file_size_mb').gte('created_at', todayStart),
      // 전체 사용자 (plan_type, created_at)
      supabase.from('profiles').select('plan_type, created_at, status'),
      // 캐시 전체 hit_count
      supabase.from('ai_cache').select('hit_count').gt('expires_at', now.toISOString()),
      // 오늘 중복 차단 (request_locks completed/failed)
      supabase.from('request_locks').select('status').gte('created_at', todayStart),
      // 이번달 사용량 합계
      supabase.from('usage_records').select('ai_cost_estimate, storage_used_mb').eq('usage_month', thisMonth),
    ])

    // 1. 오늘 요청 수
    const aiRows = aiRequestsRes.data ?? []
    const todayRequests = aiRows.length
    const successCount = aiRows.filter(r => r.status === 'success').length
    const failedCount = aiRows.filter(r => r.status === 'failed').length
    const cachedCount = aiRows.filter(r => r.status === 'cached').length
    const successRate = todayRequests > 0 ? Math.round((successCount / todayRequests) * 100) : 0
    const failRate = todayRequests > 0 ? Math.round((failedCount / todayRequests) * 100) : 0
    const cacheHitRate = todayRequests > 0 ? Math.round((cachedCount / todayRequests) * 100) : 0

    // 2. 현재 에러 수
    const errorRows = errorLogsRes.data ?? []
    const activeErrors = errorRows.length
    const criticalErrors = errorRows.filter(r => r.severity === 'critical').length

    // 3. 파일 업로드 실패율
    const fileRows = uploadedFilesRes.data ?? []
    const totalUploads = fileRows.length
    const failedUploads = fileRows.filter(r => r.status === 'failed').length
    const uploadFailRate = totalUploads > 0 ? Math.round((failedUploads / totalUploads) * 100) : 0

    // 4. 사용자 통계
    const profileRows = profilesRes.data ?? []
    const totalUsers = profileRows.length
    const paidUsers = profileRows.filter(r => r.plan_type && r.plan_type !== 'free').length
    const paidRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0

    // 가입자 증가 추이 (최근 7일)
    const subscriberTrend: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const nextDateStr = new Date(d.getTime() + 86400000).toISOString().split('T')[0]
      const count = profileRows.filter(r => {
        const c = r.created_at?.split('T')[0] ?? ''
        return c >= dateStr && c < nextDateStr
      }).length
      subscriberTrend.push({ date: dateStr, count })
    }

    // 5. 예상 AI 비용 (이번달 누계)
    const usageRows = usageRes.data ?? []
    const monthlyAiCost = usageRows.reduce((sum, r) => sum + (r.ai_cost_estimate ?? 0), 0)
    const todayAiCost = aiRows.reduce((sum, r) => sum + (r.estimated_cost ?? 0), 0)

    // 6. 저장공간 사용량
    const totalStorageMb = usageRows.reduce((sum, r) => sum + (r.storage_used_mb ?? 0), 0)

    // 7. 캐시 적중률 (활성 캐시 항목의 총 hit_count)
    const cacheRows = aiCacheRes.data ?? []
    const totalCacheHits = cacheRows.reduce((sum, r) => sum + (r.hit_count ?? 0), 0)

    // 8. 중복 요청 차단 횟수 (오늘 request_locks 수)
    const lockRows = requestLocksRes.data ?? []
    const duplicateBlocked = lockRows.filter(r => r.status === 'completed').length

    return NextResponse.json({
      updatedAt: now.toISOString(),
      // AI 요청
      todayRequests,
      successCount,
      failedCount,
      cachedCount,
      successRate,
      failRate,
      cacheHitRate,
      // 에러
      activeErrors,
      criticalErrors,
      // 파일
      totalUploads,
      failedUploads,
      uploadFailRate,
      // 사용자
      totalUsers,
      paidUsers,
      paidRate,
      subscriberTrend,
      // 비용/저장소
      todayAiCost,
      monthlyAiCost,
      totalStorageMb,
      // 캐시/잠금
      totalCacheHits,
      duplicateBlocked,
    })
  } catch (e) {
    console.error('monitoring error', e)
    return NextResponse.json({ error: '모니터링 데이터 조회 실패' }, { status: 500 })
  }
}
