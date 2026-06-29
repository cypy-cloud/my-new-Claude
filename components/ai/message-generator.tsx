"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, Copy, Download, RefreshCw, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [usage, setUsage] = useState(initialUsage)

  const remaining = Math.max(0, limit - usage)
  const isLimitReached = remaining === 0

  async function handleGenerate() {
    if (!messageType) { toast.error("메시지 유형을 선택해주세요"); return }
    if (!situation.trim()) { toast.error("상황을 입력해주세요"); return }
    if (isLimitReached) { toast.error("이번 달 사용 한도를 초과했습니다"); return }

    setLoading(true)
    setResult("")

    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType, customerName, situation, style }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          toast.error(data.error)
        } else {
          toast.error(data.error ?? "생성 중 오류가 발생했습니다")
        }
        return
      }

      setResult(data.text)
      setUsage(prev => prev + 1)
      if (data.cached) toast.info("캐시된 결과를 불러왔습니다")
      else toast.success("메시지가 생성되었습니다!")
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    toast.success("클립보드에 복사되었습니다")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `메시지_${messageType}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("파일이 다운로드되었습니다")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 입력 폼 */}
      <div className="space-y-5">
        {/* 사용량 */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
          <span className="text-sm text-blue-700">
            이번 달 사용량 <strong>{usage}/{limit}회</strong>
            {" "}
            <span className="text-blue-500">({planName} 플랜)</span>
          </span>
          {isLimitReached && (
            <Badge variant="destructive" className="text-xs">한도 초과</Badge>
          )}
          {!isLimitReached && remaining <= 3 && (
            <Badge variant="secondary" className="text-xs">{remaining}회 남음</Badge>
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
                className={`px-3 py-2 rounded-lg text-sm border text-left transition-all ${
                  messageType === type.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
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
          />
        </div>

        {/* 상황 */}
        <div className="space-y-2">
          <Label htmlFor="situation" className="text-sm font-medium">
            상황 / 요청사항 <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="situation"
            placeholder={`예: 고객이 다음 달 생명보험 만기를 앞두고 있습니다. 갱신을 권유하는 메시지를 보내고 싶습니다.`}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-[100px] resize-none"
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
                className={`px-3 py-3 rounded-lg text-sm border transition-all text-center ${
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
          disabled={loading || isLimitReached}
          className="w-full h-12 text-base"
        >
          {loading ? (
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
      </div>

      {/* 결과 */}
      <div className="space-y-4">
        <Card className="h-full min-h-[400px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>생성된 메시지</span>
              {result && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
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
            {result ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[300px]">
                {result}
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

        {result && (
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 생성하기
          </Button>
        )}
      </div>
    </div>
  )
}
