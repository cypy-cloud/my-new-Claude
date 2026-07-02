"use client"

import { useEffect, useState } from "react"
import {
  BarChart2, Users, TrendingUp, Zap, Star,
  MessageSquare, DollarSign, HardDrive
} from "lucide-react"

interface AdminReport {
  totalUsers: number
  paidUsers: number
  freeUsers: number
  conversionRate: number
  planDist: Record<string, number>
  featureUsage: { feature: string; count: number }[]
  monthlyTrend: {
    month: string
    신규가입: number
    AI생성: number
    비용: number
    저장공간MB: number
  }[]
  avgRating: number
  ratingByFeature: { feature: string; avg: number; count: number }[]
  feedbackDist: { category: string; count: number }[]
  totalFeedback: number
}

const PERIOD_OPTIONS = [
  { label: '최근 3개월', value: 3 },
  { label: '최근 6개월', value: 6 },
  { label: '최근 12개월', value: 12 },
]

const PLAN_LABELS: Record<string, string> = {
  free: '무료',
  basic: '기본',
  pro: '프로',
  premium: '프리미엄',
  team: '팀',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-400',
  basic: 'bg-blue-400',
  pro: 'bg-[#1e3a5f]',
  premium: 'bg-orange-500',
  team: 'bg-purple-500',
}

function StatCard({ icon: Icon, color, label, value, sub, highlight }: {
  icon: React.ElementType; color: string; label: string
  value: string | number; sub?: string; highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${highlight ? 'border-orange-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ label, value, max, color = 'bg-[#1e3a5f]' }: {
  label: string; value: number; max: number; color?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm text-gray-600 w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{value}</span>
    </div>
  )
}

function TrendTable({ data }: { data: AdminReport['monthlyTrend'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium">월</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium">신규 가입</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium">AI 생성</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium">AI 비용(₩)</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium">저장공간(MB)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.month} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
              <td className="py-2.5 px-3 font-medium text-gray-700">{row.month}</td>
              <td className="py-2.5 px-3 text-right text-blue-600 font-medium">{row.신규가입}</td>
              <td className="py-2.5 px-3 text-right text-[#1e3a5f] font-medium">{row.AI생성}</td>
              <td className="py-2.5 px-3 text-right text-orange-600 font-medium">₩{row.비용.toFixed(1)}</td>
              <td className="py-2.5 px-3 text-right text-purple-600 font-medium">{row.저장공간MB}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={5} className="text-center py-8 text-gray-400">데이터가 없습니다</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminReportPage() {
  const [data, setData] = useState<AdminReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState(6)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/report?months=${months}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [months])

  const maxFeature = data ? Math.max(...data.featureUsage.map(f => f.count), 1) : 1
  const maxFeedback = data ? Math.max(...data.feedbackDist.map(f => f.count), 1) : 1

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#1e3a5f]" />
            관리자 분석 리포트
          </h1>
          <p className="text-sm text-gray-500 mt-1">서비스 전체 현황 및 트렌드를 확인하세요</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setMonths(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                months === opt.value
                  ? 'bg-white text-[#1e3a5f] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">데이터를 불러올 수 없습니다</div>
      ) : (
        <>
          {/* 핵심 지표 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} color="bg-[#1e3a5f]" label="전체 사용자" value={`${data.totalUsers}명`} sub={`유료 ${data.paidUsers}명 / 무료 ${data.freeUsers}명`} />
            <StatCard icon={TrendingUp} color="bg-orange-500" label="유료 전환율" value={`${data.conversionRate}%`} sub={`유료 ${data.paidUsers}명`} highlight />
            <StatCard icon={Star} color="bg-yellow-500" label="품질 평가 평균" value={`${data.avgRating}점`} sub="5점 만점 기준" />
            <StatCard icon={MessageSquare} color="bg-purple-500" label="총 피드백" value={`${data.totalFeedback}건`} sub={`${months}개월 내`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 요금제별 분포 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                요금제별 사용자 분포
              </h2>
              <div className="space-y-1">
                {Object.entries(data.planDist)
                  .sort((a, b) => b[1] - a[1])
                  .map(([plan, count]) => (
                    <MiniBar
                      key={plan}
                      label={PLAN_LABELS[plan] ?? plan}
                      value={count}
                      max={data.totalUsers}
                      color={PLAN_COLORS[plan] ?? 'bg-gray-400'}
                    />
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {Object.entries(data.planDist).map(([plan, count]) => (
                  <span key={plan} className="text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">
                    {PLAN_LABELS[plan] ?? plan}: <strong>{count}명</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* 기능별 사용량 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-400" />
                기능별 사용량
              </h2>
              {data.featureUsage.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">사용 이력이 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {data.featureUsage.map(({ feature, count }) => (
                    <MiniBar key={feature} label={feature} value={count} max={maxFeature} />
                  ))}
                </div>
              )}
            </div>

            {/* 품질 평가 기능별 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-400" />
                기능별 품질 평가 평균
              </h2>
              {data.ratingByFeature.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">평가 데이터가 없습니다</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">기능</th>
                      <th className="text-right py-2 text-gray-500 font-medium">평균 평점</th>
                      <th className="text-right py-2 text-gray-500 font-medium">평가 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ratingByFeature.map(({ feature, avg, count }) => (
                      <tr key={feature} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-700">{feature}</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-bold ${avg >= 4 ? 'text-green-600' : avg >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                            ★ {avg}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-400">{count}건</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 피드백 유형 분석 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                피드백 유형 분석
              </h2>
              {data.feedbackDist.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">피드백이 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {data.feedbackDist.map(({ category, count }) => (
                    <MiniBar
                      key={category}
                      label={category}
                      value={count}
                      max={maxFeedback}
                      color="bg-purple-500"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 월별 추이 테이블 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-400" />
              월별 추이 (신규가입 · AI생성 · 비용 · 저장공간)
            </h2>
            <TrendTable data={data.monthlyTrend} />
          </div>
        </>
      )}
    </div>
  )
}
