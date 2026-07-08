"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, MessageSquare, FileText, BookOpen, Star,
  AlertTriangle, Loader2, RefreshCw, TrendingUp, Clock,
  Crown, Shield, User, Activity,
} from "lucide-react"

// ── 타입 ──────────────────────────────────────────
interface MemberStat {
  userId: string
  name: string | null
  email: string
  role: string
  joinedAt: string | null
  smsCount: number
  scriptCount: number
  pdfCount: number
  total: number
  costEstimate: number
}

interface TrendPoint {
  month: string
  total: number
  sms: number
  script: number
  pdf: number
  cost: number
}

interface DashboardData {
  memberCount: number
  currentMonth: string
  totals: { sms: number; script: number; pdf: number; total: number; cost: number }
  topFeature: { key: string; label: string; count: number } | null
  monthlyStats: MemberStat[]
  trendData: TrendPoint[]
  leastActiveMembers: { userId: string; name: string | null; email: string; role: string }[]
  recentActivity: { userId: string; name: string | null; featureType: string; featureLabel: string; createdAt: string }[]
}

// ── 역할 아이콘 ────────────────────────────────────
const ROLE_ICON: Record<string, React.ElementType> = { owner: Crown, manager: Shield, member: User }

function RoleIcon({ role }: { role: string }) {
  const Icon = ROLE_ICON[role] ?? User
  return <Icon className="h-3.5 w-3.5" />
}

// ── 요약 카드 ──────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 6개월 추이 바 차트 ─────────────────────────────
function TrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  const monthLabels: Record<string, string> = {
    '01': '1월', '02': '2월', '03': '3월', '04': '4월',
    '05': '5월', '06': '6월', '07': '7월', '08': '8월',
    '09': '9월', '10': '10월', '11': '11월', '12': '12월',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          최근 6개월 팀 생성 추이
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 h-32">
          {data.map(d => {
            const pct = max > 0 ? (d.total / max) * 100 : 0
            const mm = d.month.slice(5, 7)
            const isCurrentMonth = d.month === new Date().toISOString().slice(0, 7)
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{d.total > 0 ? d.total : ''}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${isCurrentMonth ? 'bg-orange-400' : 'bg-blue-200'}`}
                    style={{ height: `${Math.max(pct, d.total > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className={`text-xs ${isCurrentMonth ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>
                  {monthLabels[mm] ?? mm}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 justify-center">
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-orange-400 inline-block" />이번 달</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-blue-200 inline-block" />이전 달</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 팀원별 사용량 테이블 ───────────────────────────
function MemberStatsTable({ stats }: { stats: MemberStat[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-green-500" />
          팀원별 이번 달 사용량
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="text-left px-4 py-2.5 font-medium">팀원</th>
                <th className="text-center px-3 py-2.5 font-medium">
                  <span className="flex items-center gap-1 justify-center"><MessageSquare className="h-3 w-3" />문자</span>
                </th>
                <th className="text-center px-3 py-2.5 font-medium">
                  <span className="flex items-center gap-1 justify-center"><BookOpen className="h-3 w-3" />스크립트</span>
                </th>
                <th className="text-center px-3 py-2.5 font-medium">
                  <span className="flex items-center gap-1 justify-center"><FileText className="h-3 w-3" />PDF</span>
                </th>
                <th className="text-center px-3 py-2.5 font-medium">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.map((m, i) => (
                <tr key={m.userId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white shrink-0 ${
                        i === 0 ? 'bg-orange-400' : i === 1 ? 'bg-blue-400' : 'bg-gray-300'
                      }`}>{i + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <RoleIcon role={m.role} />
                          {m.name ?? '(이름 없음)'}
                        </p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={m.smsCount > 0 ? 'font-semibold text-blue-600' : 'text-gray-300'}>
                      {m.smsCount}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={m.scriptCount > 0 ? 'font-semibold text-purple-600' : 'text-gray-300'}>
                      {m.scriptCount}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={m.pdfCount > 0 ? 'font-semibold text-orange-600' : 'text-gray-300'}>
                      {m.pdfCount}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <Badge className={`${m.total > 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'} text-xs`}>
                      {m.total}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 활동 미흡 팀원 ─────────────────────────────────
function LeastActiveCard({ members }: { members: DashboardData['leastActiveMembers'] }) {
  if (members.length === 0) return null
  return (
    <Card className="border-yellow-200">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          이번 달 미사용 팀원 ({members.length}명)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-2 text-sm">
              <RoleIcon role={m.role} />
              <span className="text-gray-700 font-medium">{m.name ?? '(이름 없음)'}</span>
              <span className="text-gray-400 text-xs">{m.email}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-yellow-600 mt-3">
          이번 달 아직 기능을 사용하지 않은 팀원입니다. 활용 방법을 공유해보세요.
        </p>
      </CardContent>
    </Card>
  )
}

// ── 최근 활동 로그 ─────────────────────────────────
const FEATURE_COLOR: Record<string, string> = {
  ai_message: 'bg-blue-100 text-blue-700',
  ai_script: 'bg-purple-100 text-purple-700',
  ai_document: 'bg-orange-100 text-orange-700',
}

function RecentActivityCard({ activity }: { activity: DashboardData['recentActivity'] }) {
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-500" />
          최근 활동 내역
          <span className="text-xs text-gray-400 font-normal ml-1">(기능 유형만 표시 · 내용 미공개)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">최근 활동 내역이 없습니다</p>
        ) : (
          <div className="space-y-2.5">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Clock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                <span className="text-gray-600 font-medium w-20 truncate shrink-0">
                  {a.name ?? '(이름 없음)'}
                </span>
                <Badge className={`text-xs shrink-0 ${FEATURE_COLOR[a.featureType] ?? 'bg-gray-100 text-gray-600'}`}>
                  {a.featureLabel}
                </Badge>
                <span className="text-xs text-gray-400 ml-auto shrink-0">{formatTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────
export function TeamAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/teams/admin-dashboard')
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '데이터를 불러올 수 없습니다')
        return
      }
      setData(await res.json())
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>다시 시도</Button>
      </div>
    )
  }

  if (!data) return null

  const monthLabel = `${data.currentMonth.slice(0, 4)}년 ${parseInt(data.currentMonth.slice(5, 7))}월`

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">팀 관리자 대시보드</h2>
          <p className="text-sm text-gray-500 mt-0.5">{monthLabel} 기준 팀 활동 현황</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />새로고침
        </Button>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={Users}
          label="팀원 수"
          value={`${data.memberCount}명`}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="이번 달 총 생성"
          value={`${data.totals.total}회`}
          sub={`전체 팀원 합산`}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={Star}
          label="가장 많이 쓰는 기능"
          value={data.topFeature?.label ?? '없음'}
          sub={data.topFeature ? `${data.topFeature.count}회 사용` : undefined}
          color="bg-orange-50 text-orange-600"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="미사용 팀원"
          value={`${data.leastActiveMembers.length}명`}
          sub="이번 달 0회"
          color={data.leastActiveMembers.length > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}
        />
      </div>

      {/* 추이 차트 + 최근 활동 */}
      <div className="grid md:grid-cols-2 gap-4">
        <TrendChart data={data.trendData} />
        <RecentActivityCard activity={data.recentActivity} />
      </div>

      {/* 팀원별 사용량 */}
      <MemberStatsTable stats={data.monthlyStats} />

      {/* 미사용 팀원 */}
      <LeastActiveCard members={data.leastActiveMembers} />

      {/* 개인정보 보호 안내 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
        <span>
          이 대시보드는 <strong>사용 횟수와 기능 유형만</strong> 표시합니다.
          팀원이 생성한 문자 내용, 스크립트 내용, PDF 원문, 고객 정보는 관리자에게도 공개되지 않습니다.
        </span>
      </div>
    </div>
  )
}
