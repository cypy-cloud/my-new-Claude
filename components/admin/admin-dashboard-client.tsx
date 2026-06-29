"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users, CreditCard, UserPlus, Zap, MessageSquare, BookOpen,
  FileText, HardDrive, DollarSign, AlertTriangle, TrendingUp,
  Activity, BarChart3, ShieldAlert, RefreshCw, Loader2,
  FileUp, ScanSearch, Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatsCard } from "./stats-card"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

interface StatsData {
  users: { total: number; free: number; paid: number; todaySignups: number; monthSignups: number; active: number; dau: number; mau: number }
  outputs: { today: number; month: number; sms: number; script: number; pdfExplanation: number }
  files: { uploadCount: number; totalStorageMb: number; pendingDeleteCount: number; pdfAnalysisCount: number }
  costs: { aiCostUsd: number }
  errors: { monthCount: number }
  conversion: { upgradeClickCount: number; upgradeCompleteCount: number; conversionRate: number }
  featureUsage: { sms: number; script: number; pdfUpload: number; pdfAnalysis: number }
  planDistribution: Record<string, number>
  churnRiskUsers: { userId: string; name: string | null; email: string; planType: string; joinedAt: string }[]
  recentEvents: { eventName: string; featureType: string | null; pagePath: string | null; createdAt: string; userId: string | null }[]
}

const EVENT_LABELS: Record<string, string> = {
  signup: '회원가입', login: '로그인', logout: '로그아웃',
  message_complete: 'AI 문자 생성', script_complete: 'AI 스크립트 생성',
  document_analysis_complete: 'PDF 분석 완료', document_upload_complete: 'PDF 업로드',
  upgrade_click: '업그레이드 클릭', backup_download: '백업 다운로드',
  result_download: '결과 다운로드', feedback_submit: '피드백 제출',
  billing_visit: '결제 페이지 방문', error: '에러 발생',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-400', basic: 'bg-blue-500', pro: 'bg-[#1e3a5f]', premium: 'bg-orange-500'
}

export function AdminDashboardClient({ role }: { role: string }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        <p className="text-gray-500 text-sm">통계 데이터를 불러오는 중...</p>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center py-20 text-gray-400">데이터를 불러올 수 없습니다</div>
  }

  const { users, outputs, files, costs, errors, conversion, featureUsage, planDistribution, churnRiskUsers, recentEvents } = stats
  const totalFeatureUsage = featureUsage.sms + featureUsage.script + featureUsage.pdfUpload + featureUsage.pdfAnalysis || 1

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">관리자 대시보드</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            {lastUpdated && <span className="ml-2 text-gray-400">· 업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`text-xs px-3 py-1 ${role === 'super_admin' ? 'bg-orange-500 text-white' : 'bg-[#1e3a5f] text-white'}`}>
            {role === 'super_admin' ? '슈퍼관리자' : '관리자'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* ── 섹션 1: 회원 현황 ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> 회원 현황
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatsCard label="전체 회원" value={users.total.toLocaleString()} sub="탈퇴 제외" icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" highlight />
          <StatsCard label="무료 회원" value={users.free.toLocaleString()} sub={`전체의 ${users.total > 0 ? Math.round(users.free / users.total * 100) : 0}%`} icon={Users} iconBg="bg-gray-100" iconColor="text-gray-500" />
          <StatsCard label="유료 회원" value={users.paid.toLocaleString()} sub={`전체의 ${users.total > 0 ? Math.round(users.paid / users.total * 100) : 0}%`} icon={CreditCard} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <StatsCard label="활성 회원" value={users.active.toLocaleString()} sub="status=active" icon={Activity} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="오늘 가입" value={users.todaySignups} sub="오늘 0시 이후" icon={UserPlus} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <StatsCard label="이번 달 가입" value={users.monthSignups} sub="이번 달 신규" icon={UserPlus} iconBg="bg-teal-50" iconColor="text-teal-600" />
          <StatsCard label="DAU" value={dauLabel(users.dau)} sub="오늘 활성 사용자" icon={Activity} iconBg="bg-cyan-50" iconColor="text-cyan-600" />
          <StatsCard label="MAU" value={users.mau.toLocaleString()} sub="이번 달 활성 사용자" icon={BarChart3} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        </div>
      </section>

      {/* ── 섹션 2: AI 생성 현황 ────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" /> AI 생성 현황
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard label="오늘 생성" value={outputs.today} sub="오늘 0시 이후" icon={Zap} iconBg="bg-orange-50" iconColor="text-orange-500" highlight />
          <StatsCard label="이번 달 생성" value={outputs.month.toLocaleString()} sub="월 누적" icon={Zap} iconBg="bg-amber-50" iconColor="text-amber-500" />
          <StatsCard label="문자 생성" value={outputs.sms.toLocaleString()} sub="전체 누적" icon={MessageSquare} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="스크립트 생성" value={outputs.script.toLocaleString()} sub="전체 누적" icon={BookOpen} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <StatsCard label="설명자료 생성" value={outputs.pdfExplanation.toLocaleString()} sub="전체 누적" icon={FileText} iconBg="bg-rose-50" iconColor="text-rose-500" />
        </div>
      </section>

      {/* ── 섹션 3: 파일·비용·에러 ──────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <HardDrive className="h-4 w-4" /> 파일 · 비용 · 에러
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard label="PDF 업로드" value={files.uploadCount.toLocaleString()} sub="삭제 제외 현재" icon={FileUp} iconBg="bg-orange-50" iconColor="text-orange-500" />
          <StatsCard label="PDF 분석" value={files.pdfAnalysisCount.toLocaleString()} sub="전체 누적" icon={ScanSearch} iconBg="bg-violet-50" iconColor="text-violet-600" />
          <StatsCard label="저장공간" value={`${files.totalStorageMb.toFixed(1)} MB`} sub="업로드 파일 합계" icon={HardDrive} iconBg="bg-slate-100" iconColor="text-slate-600" />
          <StatsCard label="삭제 예정 파일" value={files.pendingDeleteCount} sub="만료일 이전 파일" icon={Trash2} iconBg="bg-red-50" iconColor="text-red-500" />
          <StatsCard label="AI 예상 비용" value={`$${costs.aiCostUsd.toFixed(4)}`} sub="이번 달 USD" icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" />
        </div>
      </section>

      {/* ── 분석 지표 2열 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 요금제별 분포 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> 요금제별 회원 분포
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['free', 'basic', 'pro', 'premium'] as PlanId[]).map(plan => {
              const count = planDistribution[plan] ?? 0
              const pct = users.total > 0 ? Math.round(count / users.total * 100) : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 font-medium">{PLAN_LABELS[plan]}</span>
                    <span className="text-gray-500">{count.toLocaleString()}명 ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${PLAN_COLORS[plan]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 기능별 사용량 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> 기능별 사용량 (이번 달)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'AI 문자 생성', count: featureUsage.sms, icon: MessageSquare, color: 'bg-blue-500' },
              { label: 'AI 스크립트', count: featureUsage.script, icon: BookOpen, color: 'bg-purple-500' },
              { label: 'PDF 업로드', count: featureUsage.pdfUpload, icon: FileUp, color: 'bg-orange-500' },
              { label: 'PDF 분석', count: featureUsage.pdfAnalysis, icon: ScanSearch, color: 'bg-rose-500' },
            ].map(item => {
              const Icon = item.icon
              const pct = Math.round(item.count / totalFeatureUsage * 100)
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-1.5 text-gray-700"><Icon className="h-3.5 w-3.5 text-gray-400" />{item.label}</span>
                    <span className="text-gray-500">{item.count.toLocaleString()}회 ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 구독 전환율 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> 구독 전환율 (이번 달)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-6 mb-6">
              <div>
                <p className="text-4xl font-bold text-[#1e3a5f]">{conversion.conversionRate}%</p>
                <p className="text-xs text-gray-400 mt-1">업그레이드 클릭 → 완료</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{conversion.upgradeClickCount}</p>
                  <p className="text-xs text-blue-500">업그레이드 클릭</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{conversion.upgradeCompleteCount}</p>
                  <p className="text-xs text-green-500">업그레이드 완료</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
              <span>에러 발생 (이번 달)</span>
              <span className={`font-semibold flex items-center gap-1 ${errors.monthCount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {errors.monthCount > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                {errors.monthCount}건
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 이탈 위험 사용자 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> 이탈 위험 사용자
              <Badge className="bg-red-100 text-red-600 text-xs ml-1">{churnRiskUsers.length}명</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {churnRiskUsers.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">이탈 위험 사용자 없음</p>
            ) : (
              <div className="space-y-2">
                {churnRiskUsers.map(u => (
                  <div key={u.userId} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name ?? '(이름 없음)'}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <Badge className="text-xs bg-orange-100 text-orange-700 shrink-0">
                      {PLAN_LABELS[u.planType as PlanId] ?? u.planType}
                    </Badge>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">* 유료 플랜 + 30일 이상 미접속</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 이벤트 로그 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <Activity className="h-4 w-4" /> 최근 활동 로그
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentEvents.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">이벤트 없음</p>
            ) : recentEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  ev.eventName === 'error' ? 'bg-red-400' :
                  ev.eventName.includes('complete') ? 'bg-green-400' :
                  ev.eventName === 'upgrade_click' ? 'bg-orange-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 font-medium">{EVENT_LABELS[ev.eventName] ?? ev.eventName}</span>
                  {ev.featureType && <span className="text-xs text-gray-400 ml-2">({ev.featureType})</span>}
                  {ev.pagePath && <span className="text-xs text-gray-300 ml-2">{ev.pagePath}</span>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{formatRelative(ev.createdAt)}</p>
                  {ev.userId && <p className="text-xs text-gray-300">{ev.userId.slice(0, 8)}…</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 원본 파일 열람 제한 안내 */}
      <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-700">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          관리자는 파일 메타데이터(크기, 상태, 업로드일)만 조회할 수 있습니다.
          사용자의 원본 파일 내용 및 추출 텍스트는 열람이 제한됩니다.
        </span>
      </div>
    </div>
  )
}

function dauLabel(n: number) { return n.toLocaleString() }

function formatRelative(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  return `${Math.floor(hrs / 24)}일 전`
}
