"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, Copy, Download, RefreshCw, CheckCircle, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PRODUCT_TYPES = [
  { value: "종신보험", label: "🛡️ 종신보험" },
  { value: "저축보험", label: "💰 저축보험" },
  { value: "실손보험", label: "🏥 실손보험" },
  { value: "암보험", label: "🔬 암보험" },
  { value: "자동차보험", label: "🚗 자동차보험" },
  { value: "연금보험", label: "👴 연금보험" },
  { value: "어린이보험", label: "👶 어린이보험" },
  { value: "기타", label: "📋 기타" },
]

const AGE_GROUPS = [
  { value: "20대", label: "20대" },
  { value: "30대", label: "30대" },
  { value: "40대", label: "40대" },
  { value: "50대", label: "50대" },
  { value: "60대 이상", label: "60대+" },
]

const PURPOSES = [
  { value: "신규 계약 유치", label: "신규 계약" },
  { value: "기존 계약 갱신", label: "계약 갱신" },
  { value: "추가 상품 안내", label: "추가 상품" },
  { value: "해지 방어", label: "해지 방어" },
]

export default function AiScriptPage() {
  const [productType, setProductType] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [purpose, setPurpose] = useState("")
  const [concerns, setConcerns] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    if (!productType) { toast.error("상품 유형을 선택해주세요"); return }
    if (!ageGroup) { toast.error("고객 연령대를 선택해주세요"); return }
    if (!purpose) { toast.error("상담 목적을 선택해주세요"); return }

    setLoading(true)
    setResult("")
    await new Promise((r) => setTimeout(r, 1200))

    setResult(`[${productType} 상담 스크립트 — ${ageGroup} / ${purpose}]

━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 오프닝 (신뢰 형성)

"안녕하세요, 고객님. 오늘 시간 내주셔서 감사합니다.
오늘은 고객님 상황에 꼭 맞는 ${productType}에 대해 말씨드리겠습니다."

━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 니즈 파악 질문

1. "현재 가족의 생활비는 월 얼마 정도 되시나요?"
2. "갑작스러운 상황 시 몇 개월치 생활비가 준비되어 있으신가요?"
3. "지금 가입하신 보험이 충분히 커버해 주나요?"

━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 상품 핵심 설명

✅ 보장 내용: ${productType}의 핵심 보장 설명
   → "${ageGroup}이신 분들께 가장 중요한 보장은..."

✅ 비교 우위: 타 상품 대비 장점
   → "이 상품이 특별한 이유는..."

✅ 가성비: 보험료 대비 가치
   → "하루 커피 한 잔 값으로..."

━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 우려사항 대응${concerns ? `\n"${concerns}"에 대한 답변:\n"충분히 이해합니다. 실제로 가입 후 만족하신 분들이 많습니다."` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 클로징

"오늘 결정이 어려우시면, 자료를 카톡으로 보내드릴게요.\n혼시 지금 바로 시작하시겠어요? 😊"

━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 이 스크립트는 AI가 생성한 참고용입니다. 고객 상황에 맞게 조절하세요.`)

    setLoading(false)
    toast.success("스크립트가 생성되었습니다!")
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
    a.download = `상담스크립트_${productType}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">AI 상담 스크립트 생성기</h1>
        <p className="text-gray-500 mt-1">고객 유형에 맞는 최적의 상담 스크립트를 AI가 즉시 생성합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">상품 유형 <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button key={t.value} onClick={() => setProductType(t.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border text-left transition-all ${productType === t.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/30"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">고객 연령대 <span className="text-red-500">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((a) => (
                <button key={a.value} onClick={() => setAgeGroup(a.value)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${ageGroup === a.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/30"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">상담 목적 <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {PURPOSES.map((p) => (
                <button key={p.value} onClick={() => setPurpose(p.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border text-left transition-all ${purpose === p.value ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">고객 우려사항 <span className="text-gray-400 font-normal">(선택)</span></Label>
            <Textarea placeholder="예: 보험료가 비싸다, 이미 보험이 있다..." value={concerns} onChange={(e) => setConcerns(e.target.value)} className="min-h-[80px] resize-none" />
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-base bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
            {loading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />AI가 작성 중...</> : <><Sparkles className="mr-2 h-4 w-4" />스크립트 생성하기</>}
          </Button>
        </div>

        <div className="space-y-4">
          <Card className="min-h-[500px] border-0 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center justify-between">
                <span>생성된 스크립트</span>
                {result && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1">{copied ? "복사됨" : "복사"}</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4" /><span className="ml-1">저장</span>
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {result ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[400px] font-mono">{result}</div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 space-y-3">
                  <BookOpen className="h-10 w-10 text-gray-200" />
                  <p className="text-sm">왼쪽에서 정보를 입력하고</p>
                  <p className="text-sm">"스크립트 생성하기"를 클릭하세요</p>
                </div>
              )}
            </CardContent>
          </Card>
          {result && (
            <Button variant="outline" onClick={handleGenerate} disabled={loading} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />다시 생성하기
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
