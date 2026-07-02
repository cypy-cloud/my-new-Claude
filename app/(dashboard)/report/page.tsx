"use client"

import { useEffect, useState } from "react"
import { BarChart2, Download, Star, Users, Zap, FileText, TrendingUp } from "lucide-react"

interface UserReport {
  monthTotal: number
  topFeature: string | null
  featureMap: Record<string, number>
  savedOutputs: number
  topCustomers: { name: string; count: number }[]
  downloadCount: number
  monthlyTrend: { month: string; total: number; [key: string]: number | string }[]
  featureUsage: { feature: string; count: number }[]
}

const PERIOD_OPTIONS = [
  { label: '이번 달', value: 1 },
  { label: '최근 3개월', value: 3 },
  { label: '최근 6개월', value: 6 },
]

function StatCard({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType; color: string; label: string; value: string | number; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ value, max, label, count }: { value: number; max: number; label: string; count: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1e3a5f] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
    </div>
  )
}

function MonthBar({ month, total, max }: { month: string; total: number; max: number }) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  const label = month.slice(5) + '월'
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500 font-medium">{total}</span>
      <div className="w-10 bg-gray-100 rounded-t-md overflow-hidden flex flex-col justify-end" style={{ height: 80 }}>
        <div
          className="w-full bg-[#1e3a5f] rounded-t-md transition-all duration-500"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

export default function ReportPage() {
  const [data, setData] = useState<UserReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/report/user?months=${months}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [months])

  const maxFeature = data ? Math.max(...Object.values(data.featureMap), 1) : 1
  const maxMonthly = data ? Math.max(...data.monthlyTrend.map(m => m.total), 1) : 1

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#1e3a5f]" />
            내 사용 리포트
          </h1>
          <p className="text-sm text-gray-500 mt-1">나의 AI 서비스 사용 현황을 확인하세요</p>
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
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              icon={Zap}
              color="bg-[#1e3a5f]"
              label="이번 달 생성 횟수"
              value={`${data.monthTotal}회`}
              sub="성공/캐시 응답 기준"
            />
            <StatCard
              icon={TrendingUp}
              color="bg-orange-500"
              label="가장 많이 사용한 기능"
              value={data.topFeature ?? '없음'}
              sub={data.topFeature ? `${data.featureMap[data.topFeature] ?? 0}회 사용` : undefined}
            />
            <StatCard
              icon={FileText}
              color="bg-purple-500"
              label="저장한 결과물"
              value={`${data.savedOutputs}개`}
              sub="전체 보관함 기준"
            />
            <StatCard
              icon={Users}
              color="bg-teal-500"
              label="고객 상담 이력"
              value={`${data.topCustomers.reduce((s, c) => s + c.count, 0)}건`}
              sub="전체 고객 합산"
            />
            <StatCard
              icon={Download}
              color="bg-blue-500"
              label="다운로드 횟수"
              value={`${data.downloadCount}회`}
              sub="결과물 다운로드 기준"
            />
            <StatCard
              icon={Star}
              color="bg-yellow-500"
              label="분석 기간"
              value={PERIOD_OPTIONS.find(o => o.value === months)?.label ?? ''}
              sub={`${data.monthlyTrend.length}개월 데이터`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기능별 사용 횟수 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">기능별 사용 횟수</h2>
              {data.featureUsage.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">사용 이력이 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {data.featureUsage.map(({ feature, count }) => (
                    <MiniBar
                      key={feature}
                      label={feature}
                      value={count}
                      max={data.featureUsage[0]?.count ?? 1}
                      count={count}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 고객별 상담 이력 Top 5 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">고객별 상담 이력 Top 5</h2>
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">상담 이력이 없습니다</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">순위</th>
                      <th className="text-left py-2 text-gray-500 font-medium">고객명</th>
                      <th className="text-right py-2 text-gray-500 font-medium">상담 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-yellow-100 text-yellow-700' :
                            i === 1 ? 'bg-gray-100 text-gray-600' :
                            i === 2 ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-50 text-gray-400'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                        <td className="py-2.5 text-right font-semibold text-[#1e3a5f]">{c.count}회</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 월별 생성 추이 */}
          {data.monthlyTrend.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-6">월별 AI 생성 추이</h2>
              <div className="flex items-end gap-4 justify-center">
                {data.monthlyTrend.map(m => (
                  <MonthBar
                    key={m.month}
                    month={String(m.month)}
                    total={Number(m.total)}
                    max={maxMonthly}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
