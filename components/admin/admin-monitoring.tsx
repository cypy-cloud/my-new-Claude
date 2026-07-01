"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2, RefreshCw, Activity, AlertTriangle, CheckCircle2, XCircle,
  Upload, Users, CreditCard, DollarSign, HardDrive, Zap, ShieldOff,
  TrendingUp, Clock,
} from "lucide-react"

interface MonitoringData {
  updatedAt: string
  todayRequests: number
  successCount: number
  failedCount: number
  cachedCount: number
  successRate: number
  failRate: number
  cacheHitRate: number
  activeErrors: number
  criticalErrors: number
  totalUploads: number
  failedUploads: number
  uploadFailRate: number
  totalUsers: number
  paidUsers: number
  paidRate: number
  subscriberTrend: { date: string; count: number }[]
  todayAiCost: number
  monthlyAiCost: number
  totalStorageMb: number
  totalCacheHits: number
  duplicateBlocked: number
}

interface MetricCardProps {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconColor?: string
  borderColor?: string
  status?: 'ok' | 'warn' | 'error'
}

function MetricCard({ title, value, sub, icon: Icon, iconColor = 'text-gray-400', borderColor = '', status }: MetricCardProps) {
  const statusBorder = status === 'error' ? 'border-l-4 border-l-red-400' :
    status === 'warn' ? 'border-l-4 border-l-yellow-400' :
    status === 'ok' ? 'border-l-4 border-l-green-400' : borderColor

  return (
    <Card className={`border-0 shadow-sm ${statusBorder}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-[#1e3a5f] truncate">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 ml-3`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/monitoring')
      if (res.ok) {
        setData(await res.json())
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" /> 운영 모니터링
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            서비스 현황 실시간 확인 · 30초 자동 갱신
            {lastUpdated && (
              <span className="ml-2 text-gray-400">
                (마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')})
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={load}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !data ? (
        <p className="text-center text-gray-400 py-16">데이터를 불러올 수 없습니다</p>
      ) : (
        <>
          {/* 긴급 알림 */}
          {(data.criticalErrors > 0 || data.failRate > 20) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {data.criticalErrors > 0 && `심각 에러 ${data.criticalErrors}건 발생 · `}
                {data.failRate > 20 && `AI 실패율 ${data.failRate}% — 즉시 확인 필요`}
              </span>
            </div>
          )}

          {/* AI 요청 지표 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI 요청 현황 (오늘)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                title="오늘 요청 수"
                value={data.todayRequests}
                sub={`성공 ${data.successCount} · 실패 ${data.failedCount} · 캐시 ${data.cachedCount}`}
                icon={Activity}
                iconColor="text-blue-500"
              />
              <MetricCard
                title="AI 요청 성공률"
                value={`${data.successRate}%`}
                sub={`성공 ${data.successCount}건`}
                icon={CheckCircle2}
                iconColor="text-green-500"
                status={data.successRate >= 90 ? 'ok' : data.successRate >= 70 ? 'warn' : 'error'}
              />
              <MetricCard
                title="AI 요청 실패율"
                value={`${data.failRate}%`}
                sub={`실패 ${data.failedCount}건`}
                icon={XCircle}
                iconColor="text-red-400"
                status={data.failRate === 0 ? 'ok' : data.failRate < 10 ? 'warn' : 'error'}
              />
              <MetricCard
                title="캐시 적중률"
                value={`${data.cacheHitRate}%`}
                sub={`캐시 응답 ${data.cachedCount}건`}
                icon={Zap}
                iconColor="text-yellow-500"
                status={data.cacheHitRate >= 30 ? 'ok' : 'warn'}
              />
            </div>
          </div>

          {/* 서비스 안정성 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">서비스 안정성</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                title="현재 에러 수 (오늘)"
                value={data.activeErrors}
                sub={data.criticalErrors > 0 ? `심각 ${data.criticalErrors}건 포함` : '미해결 에러'}
                icon={AlertTriangle}
                iconColor="text-red-400"
                status={data.activeErrors === 0 ? 'ok' : data.criticalErrors > 0 ? 'error' : 'warn'}
              />
              <MetricCard
                title="파일 업로드 실패율"
                value={`${data.uploadFailRate}%`}
                sub={`전체 ${data.totalUploads}건 중 ${data.failedUploads}건 실패`}
                icon={Upload}
                iconColor="text-orange-400"
                status={data.uploadFailRate === 0 ? 'ok' : data.uploadFailRate < 10 ? 'warn' : 'error'}
              />
              <MetricCard
                title="중복 요청 차단"
                value={data.duplicateBlocked}
                sub="오늘 처리된 요청 잠금"
                icon={ShieldOff}
                iconColor="text-purple-400"
              />
              <MetricCard
                title="평균 응답 시간"
                value="N/A"
                sub="추후 APM 연동 예정"
                icon={Clock}
                iconColor="text-gray-300"
              />
            </div>
          </div>

          {/* 비용/저장소 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">비용 및 저장소</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                title="예상 AI 비용 (오늘)"
                value={`$${data.todayAiCost.toFixed(4)}`}
                sub="오늘 AI 요청 비용"
                icon={DollarSign}
                iconColor="text-green-500"
              />
              <MetricCard
                title="예상 AI 비용 (이번달)"
                value={`$${data.monthlyAiCost.toFixed(3)}`}
                sub="이번달 누계"
                icon={DollarSign}
                iconColor="text-blue-500"
              />
              <MetricCard
                title="저장공간 사용량"
                value={data.totalStorageMb >= 1024
                  ? `${(data.totalStorageMb / 1024).toFixed(1)} GB`
                  : `${data.totalStorageMb.toFixed(0)} MB`}
                sub="전체 사용자 합산"
                icon={HardDrive}
                iconColor="text-gray-500"
              />
              <MetricCard
                title="캐시 총 적중 수"
                value={data.totalCacheHits}
                sub="현재 유효 캐시 합산"
                icon={Zap}
                iconColor="text-yellow-400"
              />
            </div>
          </div>

          {/* 사용자 현황 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">사용자 현황</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard
                title="총 가입자"
                value={data.totalUsers}
                sub="전체 누계"
                icon={Users}
                iconColor="text-blue-500"
              />
              <MetricCard
                title="유료 전환율"
                value={`${data.paidRate}%`}
                sub={`유료 ${data.paidUsers}명 / 전체 ${data.totalUsers}명`}
                icon={CreditCard}
                iconColor="text-green-500"
                status={data.paidRate >= 10 ? 'ok' : data.paidRate >= 3 ? 'warn' : undefined}
              />
              <MetricCard
                title="오늘 신규 가입"
                value={data.subscriberTrend[data.subscriberTrend.length - 1]?.count ?? 0}
                sub="오늘 기준"
                icon={TrendingUp}
                iconColor="text-purple-400"
              />
            </div>
          </div>

          {/* 가입자 증가 추이 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> 가입자 증가 추이 (최근 7일)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {data.subscriberTrend.map(d => (
                        <th key={d.date} className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                          {new Date(d.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {data.subscriberTrend.map((d, i) => {
                        const isToday = i === data.subscriberTrend.length - 1
                        return (
                          <td key={d.date} className="text-center px-3 py-3">
                            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                              {d.count}
                            </div>
                            <div className="text-xs text-gray-400">명</div>
                          </td>
                        )
                      })}
                    </tr>
                    <tr>
                      {data.subscriberTrend.map((d, i) => {
                        const maxCount = Math.max(...data.subscriberTrend.map(x => x.count), 1)
                        const pct = (d.count / maxCount) * 100
                        const isToday = i === data.subscriberTrend.length - 1
                        return (
                          <td key={d.date} className="px-3 pb-2">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isToday ? 'bg-blue-500' : 'bg-[#1e3a5f]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 하단 상세 테이블 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1e3a5f]">지표 요약 테이블</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">항목</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">값</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { label: '오늘 AI 요청 수', value: `${data.todayRequests}건`, status: 'normal' },
                      { label: '현재 미해결 에러', value: `${data.activeErrors}건`, status: data.activeErrors > 0 ? (data.criticalErrors > 0 ? 'error' : 'warn') : 'ok' },
                      { label: 'AI 요청 성공률', value: `${data.successRate}%`, status: data.successRate >= 90 ? 'ok' : data.successRate >= 70 ? 'warn' : 'error' },
                      { label: 'AI 요청 실패율', value: `${data.failRate}%`, status: data.failRate === 0 ? 'ok' : data.failRate < 10 ? 'warn' : 'error' },
                      { label: '평균 응답 시간', value: 'N/A', status: 'normal' },
                      { label: '파일 업로드 실패율', value: `${data.uploadFailRate}%`, status: data.uploadFailRate === 0 ? 'ok' : data.uploadFailRate < 10 ? 'warn' : 'error' },
                      { label: '가입자 (오늘 신규)', value: `${data.subscriberTrend[data.subscriberTrend.length - 1]?.count ?? 0}명`, status: 'normal' },
                      { label: '유료 전환율', value: `${data.paidRate}%`, status: data.paidRate >= 10 ? 'ok' : 'normal' },
                      { label: '예상 AI 비용 (이번달)', value: `$${data.monthlyAiCost.toFixed(4)}`, status: 'normal' },
                      { label: '저장공간 사용량', value: `${data.totalStorageMb.toFixed(0)} MB`, status: 'normal' },
                      { label: '캐시 적중률 (오늘)', value: `${data.cacheHitRate}%`, status: data.cacheHitRate >= 30 ? 'ok' : 'normal' },
                      { label: '중복 요청 차단 횟수', value: `${data.duplicateBlocked}건`, status: 'normal' },
                    ].map(row => (
                      <tr key={row.label} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-700">{row.label}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800">{row.value}</td>
                        <td className="px-4 py-2.5 text-right">
                          {row.status === 'ok' && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">정상</span>}
                          {row.status === 'warn' && <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">주의</span>}
                          {row.status === 'error' && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">위험</span>}
                          {row.status === 'normal' && <span className="text-xs text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
