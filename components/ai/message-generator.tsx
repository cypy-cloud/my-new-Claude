"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Sparkles, Copy, Download, RefreshCw, CheckCircle, AlertCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAIGenerate } from "@/hooks/useAIGenerate"

const MESSAGE_TYPES = [
  { value: "생일 축하", label: "🎂 생일 축하" },
  { value: "보험 만기 안내", label: "📋 보험 만기 안내" },
  { value: "신상품 소개", label: "✨ 신상품 소개" },
  { value: "감사 메시지", label: "💙 감사 메시지" },
  { value: "명절 인사", label: "🎊 명절 인사" },
  { value: "계약 갱신 안내", label: "🔄 계약 갱신 안내" },
  { value: "기타", label: "✏️ 기타" },
]

const STYLES = [
  { value: "격식체", label: "격식체", desc: "정중하고 공식적인 문체" },
  { value: "친근체", label: "친근체", desc: "따뜻하고 편안한 문체" },
  { value: "카카오톡 스타일", label: "카톡 스타일", desc: "이모티콘 포함, 짧고 경쾌" },
]

interface Props {
  initialUsage: number
  limit: number
  planName: string
}

export function MessageGenerator({ initialUsage, limit, planName }: Props) {
  const [messageType, setMessageType] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [situation, setSituation] = useState("")
  const [style, setStyle] = useState("친근체")
  const [copied, setCopied] = useState(false)

  const { state, generate } = useAIGenerate(
    Math.max(0, limit - initialUsage),
    { endpoint: "/api/ai/message", minIntervalMs: 1000, maxRetries: 1 }
  )

  const isLoading = state.status === 'loading'
  const isLimitReached = state.remaining === 0
  const hasResult = state.status === 'success' && !!state.result

  // Show toasts when status changes
  useEffect(() => {
    if (state.status === 'success') {
      if (state.cached) toast.info("이전에 생성된 결과를 불러왔습니다")
      else toast.success("메시지가 생성되었습니다!")
    }
    if (state.status === 'error' && state.error) {
      toast.error(state.error)
    }
  }, [state.status, state.cached, state.error])

  function buildParams(forceRegenerate = false) {
    return { messageType, customerName, situation, style, forceRegenerate }
  }

  function handleGenerate() {
    if (!messageType) { toast.error("메시지 유형을 선택해주세요"); return }
    if (!situation.trim()) { toast.error("상황을 입력해주세요"); return }
    if (isLimitReached) { toast.error("이번 달 사용 한도를 초과했습니다"); return }
    generate(buildParams(false))
  }

  function handleRegenerate() {
    if (!messageType || !situation.trim()) return
    generate(buildParams(true))
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(state.result)
    setCopied(true)
    toast.success("클립보드에 복사되었습니다")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([state.result], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `메시지_${messageType}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("파일이 다운로드되었습니다")
  }

  const usedCount = limit - state.remaining

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 입력 폼 */}
      <div className="space-y-5">
        {/* 사용량 */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          isLimitReached
            ? "bg-red-50 border-red-200"
            : state.remaining <= 3
            ? "bg-yellow-50 border-yellow-200"
            : "bg-blue-50 border-blue-100"
        }`}>
          <span className={`text-sm ${isLimitReached ? "text-red-700" : state.remaining <= 3 ? "text-yellow-700" : "text-blue-700"}`}>
            이번 달 사용량 <strong>{usedCount}/{limit}회</strong>
            {" "}
            <span className="opacity-70">({planName} 플랜)</span>
          </span>
          {isLimitReached && <Badge variant="destructive" className="text-xs">한도 초과</Badge>}
          {!isLimitReached && state.remaining <= 3 && (
            <Badge className="text-xs bg-yellow-500 text-white">{state.remaining}회 남음</Badge>
          )}
        </div>

        {/* 메시지 유형 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">메시지 유형 <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {MESSAGE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setMessageType(type.value)}
                disabled={isLoading}
                className={`px-3 py-2 rounded-lg text-sm border text-left transition-all ${
                  messageType === type.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* 고객 이름 */}
        <div className="space-y-2">
          <Label htmlFor="customerName" className="text-sm font-medium">
            고객 이름 <span className="text-gray-400 font-normal">(선택)</span>
          </Label>
          <Input
            id="customerName"
            placeholder="예: 홍길동"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* 상황 */}
        <div className="space-y-2">
          <Label htmlFor="situation" className="text-sm font-medium">
            상황 / 요청사항 <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="situation"
            placeholder="예: 고객이 다음 달 생명보험 만기를 앞두고 있습니다. 갱신을 권유하는 메시지를 보내고 싶습니다."
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isLoading}
          />
        </div>

        {/* 스타일 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">메시지 스타일</Label>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                disabled={isLoading}
                className={`px-3 py-3 rounded-lg text-sm border transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  style === s.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className={`text-xs mt-1 ${style === s.value ? "text-blue-100" : "text-gray-400"}`}>
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isLoading || isLimitReached}
          className="w-full h-12 text-base bg-[#1e3a5f] hover:bg-[#162d4a]"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              AI가 작성 중...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              메시지 생성하기
            </>
          )}
        </Button>

        {state.status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}
      </div>

      {/* 결과 */}
      <div className="space-y-3">
        <Card className="min-h-[420px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>생성된 메시지</span>
              {hasResult && (
                <div className="flex gap-2">
                  {state.cached && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Zap className="h-3 w-3" /> 캐시
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <Copy className="h-4 w-4" />}
                    <span className="ml-1">{copied ? "복사됨" : "복사"}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    <span className="ml-1">저장</span>
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                </div>
                <p className="text-sm text-gray-500">AI가 메시지를 작성하고 있습니다...</p>
              </div>
            ) : hasResult ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[300px]">
                {state.result}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 space-y-3">
                <Sparkles className="h-10 w-10 text-gray-200" />
                <p className="text-sm">왼쪽에서 정보를 입력하고</p>
                <p className="text-sm">"메시지 생성하기"를 클릭하세요</p>
              </div>
            )}
          </CardContent>
        </Card>

        {hasResult && (
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isLoading}
            className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            다시 생성하기 (새로 생성)
          </Button>
        )}

        {state.provider && hasResult && (
          <p className="text-xs text-gray-400 text-center">
            {state.cached ? "캐시에서 불러옴" : `${state.provider} 모델로 생성됨`}
          </p>
        )}
      </div>
    </div>
  )
}
