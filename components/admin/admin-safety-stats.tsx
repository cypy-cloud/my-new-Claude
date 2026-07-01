"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldX, ShieldAlert, ShieldCheck, BarChart2, AlertTriangle } from "lucide-react"

interface ByFeature {
  featureType: string
  total: number
  high: number
  medium: number
}

interface RecentHigh {
  id: string
  featureType: string
  riskLevel: string
  issues: Array<{ categoryLabel: string; flaggedText: string; severity: string }>
  createdAt: string
}

interface Stats {
  total: number
  byRisk: { low: number; medium: number; high: number }
  byFeature: ByFeature[]
  categoryCount: Record<string, number>
  recentHigh: RecentHigh[]
}

const FEATURE_LABELS: Record<string, string> = {
  ai_message: 'AI 문자',
  ai_script: 'AI 스크립트',
  ai_document: 'AI 문서',
  ai_followup: '팔로업',
}

const CATEGORY_LABELS: Record<string, string> = {
  guaranteed_coverage: '확정적 보장 표현',
  guaranteed_return: '확정 수익률',
  claim_guarantee: '보험금 지급 보장',
  fear_inducing: '과도한 불안 조장',
  medical_legal_claim: '의료/법률 단정',
  competitor_comparison: '특정 회사 비교',
  false_claim: '허위 가능성',
  misleading: '오해 유발 표현',
}

export function AdminSafetyStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  async function load(d = days) {
    setLoading(true)
    const res = await fetch(`/api/admin/safety-stats?days=${d}`)
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const totalIssues = stats ? Object.values(stats.categoryCount).reduce((a, b) => a + b, 0) : 0
  const dangerRate = stats && stats.total > 0 ? Math.round((stats.byRisk.high / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-red-500" /> 컴플라이언스 안전성 통계
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">AI 결과물의 위험 표현 감지 현황</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'}
              className={days === d ? 'bg-[#1e3a5f] text-white' : ''}
              onClick={() => { setDays(d); load(d) }}>
              {d}일
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : !stats ? (
        <p className="text-center text-gray-400 py-16">데이터 없음</p>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-[#1e3a5f]">{stats.total}</div>
                <div className="text-xs text-gray-500 mt-1">총 검사 수</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center border-l-4 border-l-red-400">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-red-500">{stats.byRisk.high}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <ShieldX className="h-3 w-3 text-red-400" /> 위험
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center border-l-4 border-l-yellow-400">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-yellow-500">{stats.byRisk.medium}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-yellow-400" /> 주의
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center border-l-4 border-l-green-400">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-500">{stats.byRisk.low}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-green-400" /> 안전
                </div>
              </CardContent>
            </Card>
          </div>

          {dangerRate > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>최근 {days}일 AI 생성 결과의 <strong>{dangerRate}%</strong>에서 위험 표현이 감지되었습니다. 프롬프트 개선이 필요합니다.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 기능별 위험도 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" /> 기능별 위험도
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.byFeature.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">데이터 없음</p>
                ) : (
                  <div className="space-y-4">
                    {stats.byFeature.map(f => {
                      const highPct = f.total > 0 ? (f.high / f.total) * 100 : 0
                      const medPct = f.total > 0 ? (f.medium / f.total) * 100 : 0
                      return (
                        <div key={f.featureType}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {FEATURE_LABELS[f.featureType] ?? f.featureType}
                            </span>
                            <span className="text-xs text-gray-400">{f.total}건</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-red-400" style={{ width: `${highPct}%` }} />
                            <div className="h-full bg-yellow-400" style={{ width: `${medPct}%` }} />
                            <div className="h-full bg-green-400" style={{ width: `${100 - highPct - medPct}%` }} />
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-gray-400">
                            <span className="text-red-500">위험 {f.high}</span>
                            <span className="text-yellow-500">주의 {f.medium}</span>
                            <span className="text-green-500">안전 {f.total - f.high - f.medium}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 위험 유형 분포 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f]">위험 표현 유형 분포</CardTitle>
              </CardHeader>
              <CardContent>
                {totalIssues === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">감지된 위험 표현 없음</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.categoryCount)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-36 shrink-0">
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full"
                              style={{ width: `${(count / totalIssues) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 최근 위험 감지 */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
                  <ShieldX className="h-4 w-4 text-red-400" /> 최근 위험 감지 내역
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentHigh.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">최근 위험 감지 없음</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {stats.recentHigh.map(r => (
                      <div key={r.id} className="border border-red-100 rounded-lg p-3 bg-red-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                            {FEATURE_LABELS[r.featureType] ?? r.featureType}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(r.issues ?? []).map((issue, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                              issue.severity === 'danger'
                                ? 'bg-red-200 text-red-700'
                                : 'bg-yellow-200 text-yellow-700'
                            }`}>
                              {issue.categoryLabel}: &ldquo;{issue.flaggedText}&rdquo;
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
