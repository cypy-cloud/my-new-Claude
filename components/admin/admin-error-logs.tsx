"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle, AlertCircle, Info, Loader2, CheckCircle,
  RefreshCw, ChevronDown, ChevronUp, Filter
} from "lucide-react"
import { toast } from "sonner"

interface ErrorLog {
  id: string
  user_id: string | null
  area: string
  error_message: string
  severity: string
  resolved: boolean
  resolved_at: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

interface ErrorDetail extends ErrorLog {
  stack_trace: string | null
}

interface Summary {
  total: number
  unresolved: number
  critical: number
  high: number
  medium: number
  low: number
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-gray-100 text-gray-600 border-gray-200',
}

const SEVERITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  critical: AlertCircle,
  high:     AlertTriangle,
  medium:   AlertTriangle,
  low:      Info,
}

const AREA_LABELS: Record<string, string> = {
  auth: '인증', ai: 'AI', upload: '업로드', payment: '결제',
  admin: '관리자', database: 'DB', unknown: '기타',
}

const AREAS = ['', 'auth', 'ai', 'upload', 'payment', 'admin', 'database', 'unknown']
const SEVERITIES = ['', 'critical', 'high', 'medium', 'low']

export function AdminErrorLogs() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [area, setArea] = useState('')
  const [severity, setSeverity] = useState('')
  const [resolved, setResolved] = useState('false')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ErrorDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (area) params.set('area', area)
    if (severity) params.set('severity', severity)
    if (resolved) params.set('resolved', resolved)
    const res = await fetch(`/api/admin/errors?${params}`)
    const data = await res.json()
    setErrors(data.errors ?? [])
    setSummary(data.summary ?? null)
    setLoading(false)
  }, [area, severity, resolved])

  useEffect(() => { load() }, [load])

  async function loadDetail(id: string) {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return }
    setExpandedId(id)
    setDetail(null)
    setDetailLoading(true)
    const res = await fetch('/api/admin/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'detail', errorId: id }),
    })
    const data = await res.json()
    setDetail(data.error ?? null)
    setDetailLoading(false)
  }

  async function resolve(id: string) {
    setResolving(id)
    const res = await fetch('/api/admin/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', errorId: id }),
    })
    if (res.ok) {
      toast.success('해결 처리되었습니다')
      setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e))
    } else {
      toast.error('처리 실패')
    }
    setResolving(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> 에러 로그
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">API·AI·업로드·인증 에러 전체 이력</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: '전체', value: summary.total, color: 'text-gray-700' },
            { label: '미해결', value: summary.unresolved, color: 'text-red-600 font-bold' },
            { label: 'Critical', value: summary.critical, color: 'text-red-600' },
            { label: 'High', value: summary.high, color: 'text-orange-600' },
            { label: 'Medium', value: summary.medium, color: 'text-amber-600' },
            { label: 'Low', value: summary.low, color: 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={area} onChange={e => setArea(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700">
          {AREAS.map(a => <option key={a} value={a}>{a ? AREA_LABELS[a] ?? a : '전체 영역'}</option>)}
        </select>
        <select value={severity} onChange={e => setSeverity(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700">
          {SEVERITIES.map(s => <option key={s} value={s}>{s || '전체 심각도'}</option>)}
        </select>
        <select value={resolved} onChange={e => setResolved(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700">
          <option value="">전체</option>
          <option value="false">미해결</option>
          <option value="true">해결됨</option>
        </select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">에러 목록 ({errors.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : errors.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">에러 없음</div>
          ) : (
            <div className="divide-y">
              {errors.map(err => {
                const SevIcon = SEVERITY_ICONS[err.severity] ?? Info
                const isExpanded = expandedId === err.id
                return (
                  <div key={err.id} className={`${err.resolved ? 'opacity-50' : ''}`}>
                    <div
                      className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadDetail(err.id)}
                    >
                      <SevIcon className={`h-4 w-4 mt-0.5 shrink-0 ${
                        err.severity === 'critical' ? 'text-red-500' :
                        err.severity === 'high' ? 'text-orange-500' :
                        err.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs border ${SEVERITY_STYLES[err.severity]}`}>
                            {err.severity.toUpperCase()}
                          </Badge>
                          <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-200">
                            {AREA_LABELS[err.area] ?? err.area}
                          </Badge>
                          {err.resolved && (
                            <Badge className="text-xs bg-green-100 text-green-700">해결됨</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 truncate font-medium">{err.error_message}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">{formatRelative(err.created_at)}</span>
                          {err.user_id && <span className="text-xs text-gray-300">{err.user_id.slice(0, 8)}…</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!err.resolved && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={e => { e.stopPropagation(); resolve(err.id) }}
                            disabled={resolving === err.id}
                          >
                            {resolving === err.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <CheckCircle className="h-3 w-3 mr-1" />
                            }
                            해결
                          </Button>
                        )}
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-gray-400" />
                          : <ChevronDown className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                    </div>

                    {/* 상세 패널 */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                        {detailLoading ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
                        ) : detail && detail.id === err.id ? (
                          <div className="space-y-3 pt-3">
                            {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">메타데이터</p>
                                <pre className="text-xs bg-white rounded-lg p-3 border border-gray-200 overflow-x-auto text-gray-700">
                                  {JSON.stringify(detail.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            {detail.stack_trace && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">스택 트레이스</p>
                                <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto max-h-48 leading-relaxed">
                                  {detail.stack_trace}
                                </pre>
                              </div>
                            )}
                            {detail.resolved_at && (
                              <p className="text-xs text-green-600">
                                해결됨: {new Date(detail.resolved_at).toLocaleString('ko-KR')}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatRelative(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}일 전`
  return new Date(isoStr).toLocaleDateString('ko-KR')
}
