"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Star, ThumbsUp, ThumbsDown, BarChart2, MessageSquare } from "lucide-react"

interface Summary {
  totalCount: number
  avgRating: number
  helpfulCount: number
  unhelpfulCount: number
}

interface FeatureStat {
  feature_type: string
  count: number
  avg_rating: number
  helpful_count: number
  unhelpful_count: number
}

interface PromptVersionStat {
  prompt_version: string
  count: number
  avg_rating: number
}

interface Feedback {
  id: string
  user_id: string
  feature_type: string
  rating: number
  is_helpful: boolean | null
  feedback_text: string
  issue_type: string | null
  prompt_version: string | null
  created_at: string
}

const FEATURE_LABELS: Record<string, string> = {
  ai_message: 'AI 문자', ai_script: 'AI 스크립트',
  ai_document: 'AI 문서', ai_followup: '팔로업',
}

const ISSUE_LABELS: Record<string, string> = {
  useful: '유용해요', awkward: '어색해요', inaccurate: '내용 틀림',
  too_long: '너무 길어요', too_short: '너무 짧아요',
  compliance_risk: '컴플라이언스 위험', other: '기타',
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
      <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
    </span>
  )
}

export function AdminAiQuality() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byFeature, setByFeature] = useState<FeatureStat[]>([])
  const [byPromptVersion, setByPromptVersion] = useState<PromptVersionStat[]>([])
  const [issueDistribution, setIssueDistribution] = useState<Record<string, number>>({})
  const [recentFeedback, setRecentFeedback] = useState<Feedback[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  async function load(d = days) {
    setLoading(true)
    const res = await fetch(`/api/admin/ratings?days=${d}`)
    if (res.ok) {
      const data = await res.json()
      setSummary(data.summary)
      setByFeature(data.byFeature)
      setByPromptVersion(data.byPromptVersion)
      setIssueDistribution(data.issueDistribution)
      setRecentFeedback(data.recentFeedback)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const totalIssues = Object.values(issueDistribution).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" /> AI 품질 통계
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">사용자 평가 기반 AI 결과물 품질 현황</p>
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
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-[#1e3a5f]">{summary?.totalCount ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1">총 평가 수</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-yellow-500">{(summary?.avgRating ?? 0).toFixed(1)}</div>
                <div className="flex justify-center mt-1">
                  <StarDisplay rating={summary?.avgRating ?? 0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">평균 별점</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-500">{summary?.helpfulCount ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> 도움됐어요
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-red-400">{summary?.unhelpfulCount ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <ThumbsDown className="h-3 w-3" /> 아쉬워요
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 기능별 평균 평점 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" /> 기능별 평균 평점
                </CardTitle>
              </CardHeader>
              <CardContent>
                {byFeature.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">데이터 없음</p>
                ) : (
                  <div className="space-y-4">
                    {byFeature.map(f => {
                      const pct = (f.avg_rating / 5) * 100
                      return (
                        <div key={f.feature_type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {FEATURE_LABELS[f.feature_type] ?? f.feature_type}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{f.count}건</span>
                              <StarDisplay rating={f.avg_rating} />
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3 text-blue-400" />{f.helpful_count}</span>
                            <span className="flex items-center gap-0.5"><ThumbsDown className="h-3 w-3 text-red-400" />{f.unhelpful_count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 프롬프트 버전별 비교 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f]">프롬프트 버전별 품질 비교</CardTitle>
              </CardHeader>
              <CardContent>
                {byPromptVersion.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">데이터 없음</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['버전', '평가 수', '평균 별점'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {byPromptVersion.map(pv => (
                          <tr key={pv.prompt_version} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs font-mono text-gray-700">{pv.prompt_version}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{pv.count}건</td>
                            <td className="px-3 py-2"><StarDisplay rating={pv.avg_rating} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 문제 유형 분포 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f]">문제 유형 분포</CardTitle>
              </CardHeader>
              <CardContent>
                {totalIssues === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">데이터 없음</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(issueDistribution)
                      .sort(([,a],[,b]) => b - a)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-28 shrink-0">{ISSUE_LABELS[type] ?? type}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1e3a5f] rounded-full"
                              style={{ width: `${(count / totalIssues) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 최근 피드백 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> 최근 텍스트 피드백
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentFeedback.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">피드백 없음</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {recentFeedback.map(f => (
                      <div key={f.id} className="border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {FEATURE_LABELS[f.feature_type] ?? f.feature_type}
                          </span>
                          <StarDisplay rating={f.rating} />
                          {f.is_helpful === true && <span className="text-xs text-blue-500 flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />도움됨</span>}
                          {f.is_helpful === false && <span className="text-xs text-red-400 flex items-center gap-0.5"><ThumbsDown className="h-3 w-3" />아쉬움</span>}
                          {f.issue_type && <span className="text-xs text-orange-500">{ISSUE_LABELS[f.issue_type] ?? f.issue_type}</span>}
                          <span className="text-xs text-gray-400 ml-auto">{new Date(f.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{f.feedback_text}</p>
                        {f.prompt_version && (
                          <p className="text-xs text-gray-400 mt-1 font-mono">버전: {f.prompt_version}</p>
                        )}
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
