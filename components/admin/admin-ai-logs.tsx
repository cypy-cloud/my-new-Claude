"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Sparkles } from "lucide-react"

interface LogRow {
  id: string
  user_id: string
  feature_type: string
  provider: string
  model: string
  status: string
  input_tokens: number
  output_tokens: number
  estimated_cost: number
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cached: 'bg-blue-100 text-blue-700',
}

export function AdminAiLogs() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [feature, setFeature] = useState("")
  const [status, setStatus] = useState("")
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  async function load(newOffset = 0) {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) })
    if (userId) params.set('userId', userId)
    if (feature) params.set('feature', feature)
    if (status) params.set('status', status)
    const res = await fetch(`/api/admin/ai-logs?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setTotal(data.total ?? 0)
    setOffset(newOffset)
    setLoading(false)
  }

  useEffect(() => { load(0) }, [feature, status]) // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> AI 요청 로그
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">AI 기능 사용 기록 조회</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="사용자 ID" value={userId} onChange={e => setUserId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(0)} className="w-64" />
        <select value={feature} onChange={e => setFeature(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
          <option value="">전체 기능</option>
          {['ai_message', 'ai_script', 'ai_document', 'ai_followup', 'pdf_analysis'].map(f =>
            <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
          <option value="">전체 상태</option>
          {['success', 'failed', 'cached'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="outline" onClick={() => load(0)}>검색</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">AI 요청 기록 (총 {total}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['시각', '사용자 ID', '기능', 'Provider/모델', '상태', '입력 토큰', '출력 토큰', '비용(원)'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">기록 없음</td></tr>
                  ) : logs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 max-w-[120px] truncate" title={l.user_id}>
                        {l.user_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-xs">{l.feature_type}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={l.provider === 'mock' ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {l.provider}
                        </span>
                        <span className="text-gray-400"> / {l.model}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[l.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-right">{l.input_tokens?.toLocaleString() ?? '-'}</td>
                      <td className="px-4 py-3 text-xs text-right">{l.output_tokens?.toLocaleString() ?? '-'}</td>
                      <td className="px-4 py-3 text-xs text-right">
                        {l.estimated_cost != null ? `₩${(l.estimated_cost * 1300).toFixed(1)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > LIMIT && (
            <div className="flex justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>이전</Button>
              <span className="text-sm text-gray-500 self-center">{Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}</span>
              <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => load(offset + LIMIT)}>다음</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
