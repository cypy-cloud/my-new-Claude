"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Star, RefreshCw, Copy, Check, Lightbulb, PenLine, Mic, MicOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { MonthlyUsageData } from "@/lib/subscription/usage"
import type { PlanLimits } from "@/lib/subscription/plans"

interface Review {
  version: number
  title: string
  content: string
  tags: string
}

interface ReviewWriterProps {
  planName: string
  limits: PlanLimits
  usage: MonthlyUsageData
}

const VERSION_LABELS = ["짧은 버전", "중간 버전", "상세 버전"]
const VERSION_COLORS = [
  "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
  "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
  "border-purple-200 bg-purple-50 dark:bg-purple-950/20",
]
const BADGE_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
]

export function ReviewWriter({ planName, limits, usage }: ReviewWriterProps) {
  const [form, setForm] = useState({
    customerName: "",
    productName: "",
    consultationDate: "",
    keyPoints: "",
    customerReaction: "",
    outcome: "",
    agentStyle: "친절하고 전문적",
    reviewPlatform: "일반",
    reviewTone: "따뜻하고 진솔한",
  })
  const [loading, setLoading] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isCorrectingVoice, setIsCorrectingVoice] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef("")

  async function correctVoiceInput(rawText: string) {
    if (!rawText.trim()) return
    setIsCorrectingVoice(true)
    try {
      const res = await fetch("/api/ai/voice-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, context: { purpose: "상담내용", productField: form.productName, tone: "자연스러운" } }),
      })
      const data = await res.json()
      update("keyPoints", (form.keyPoints ? form.keyPoints + " " : "") + (data.corrected ?? rawText))
    } catch {
      update("keyPoints", (form.keyPoints ? form.keyPoints + " " : "") + rawText)
    } finally {
      setIsCorrectingVoice(false)
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
    const transcript = transcriptRef.current.trim()
    transcriptRef.current = ""
    if (transcript) correctVoiceInput(transcript)
  }

  function toggleRecording() {
    if (isRecording) { stopRecording(); return }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { toast.error("이 브라우저는 음성 입력을 지원하지 않습니다"); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "ko-KR"
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition
    transcriptRef.current = ""
    recognition.onresult = (e: any) => {
      let final = ""
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final) transcriptRef.current = final
    }
    recognition.onend = () => { if (isRecording) stopRecording() }
    recognition.onerror = () => { setIsRecording(false); toast.error("음성 인식 오류가 발생했습니다") }
    recognition.start()
    setIsRecording(true)
    toast.info("녹음 중... 말씀하신 후 정지 버튼을 누르세요")
  }

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    if (!form.productName || !form.keyPoints) {
      toast.error("상품명과 주요 상담 내용을 입력해주세요")
      return
    }

    setLoading(true)
    setReviews([])
    setTips("")

    try {
      const res = await fetch("/api/ai/review-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.limitExceeded ? "이번 달 사용 한도를 초과했습니다." : (data.error ?? "생성 실패"))
        return
      }

      setReviews(data.reviews ?? [])
      setTips(data.tips ?? "")
      toast.success(data.cached ? "이전 결과를 불러왔습니다" : "후기 3가지 버전 생성 완료!")
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  function copyReview(review: Review, idx: number) {
    const text = `${review.title}\n\n${review.content}\n\n${review.tags}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    toast.success(`버전${idx + 1} 복사 완료!`)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          사용량: <span className="font-semibold text-gray-900">{usage.scriptCount} / {limits.scriptLimit}회</span>
        </p>
      </div>

      {/* 입력 폼 */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>상품명 <span className="text-red-500">*</span></Label>
              <Input placeholder="예: 종신보험, 암보험, 실손의료보험..." value={form.productName} onChange={e => update("productName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>고객명 <span className="text-gray-400 text-xs">(선택 — 익명 처리됨)</span></Label>
              <Input placeholder="예: 김○○ 고객님" value={form.customerName} onChange={e => update("customerName", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>주요 상담 내용 <span className="text-red-500">*</span></Label>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isCorrectingVoice}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                  isRecording
                    ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {isCorrectingVoice ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />교정 중</>
                ) : isRecording ? (
                  <><MicOff className="h-3 w-3" />정지</>
                ) : (
                  <><Mic className="h-3 w-3" />음성 입력</>
                )}
              </button>
            </div>
            <Textarea
              placeholder="예: 40대 맞벌이 부부로 자녀 교육비와 노후 준비를 동시에 고민하셨고, 종신보험으로 사망보장과 해지환급금을 활용한 교육자금 마련을 제안드렸습니다."
              value={form.keyPoints}
              onChange={e => update("keyPoints", e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-xs text-gray-400">마이크 버튼으로 음성 입력도 가능합니다. 어설픈 발음도 AI가 자동 교정합니다.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>고객 반응 / 만족 포인트</Label>
              <Input placeholder="예: 세금 혜택 설명에 만족, 비교 분석 자료 제공" value={form.customerReaction} onChange={e => update("customerReaction", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>상담 결과</Label>
              <Input placeholder="예: 계약 완료, 추가 검토 중..." value={form.outcome} onChange={e => update("outcome", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>설계사 스타일</Label>
              <select value={form.agentStyle} onChange={e => update("agentStyle", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="친절하고 전문적">친절하고 전문적</option>
                <option value="꼼꼼하고 신뢰감 있는">꼼꼼하고 신뢰감 있는</option>
                <option value="따뜻하고 공감하는">따뜻하고 공감하는</option>
                <option value="빠르고 효율적인">빠르고 효율적인</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>게재 플랫폼</Label>
              <select value={form.reviewPlatform} onChange={e => update("reviewPlatform", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="일반">일반</option>
                <option value="네이버 블로그">네이버 블로그</option>
                <option value="카카오톡 채널">카카오톡 채널</option>
                <option value="인스타그램">인스타그램</option>
                <option value="구글 리뷰">구글 리뷰</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>후기 톤</Label>
              <select value={form.reviewTone} onChange={e => update("reviewTone", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="따뜻하고 진솔한">따뜻하고 진솔한</option>
                <option value="전문적이고 신뢰감 있는">전문적이고 신뢰감 있는</option>
                <option value="감동적이고 감사한">감동적이고 감사한</option>
                <option value="간결하고 임팩트 있는">간결하고 임팩트 있는</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !form.productName || !form.keyPoints}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            size="lg"
          >
            {loading
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />후기 생성 중...</>
              : <><PenLine className="h-4 w-4 mr-2" />후기 3가지 버전 생성</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* 결과 */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">생성된 후기</h2>
            <Badge variant="outline">3가지 버전</Badge>
          </div>

          {reviews.map((review, i) => (
            <Card key={i} className={`border ${VERSION_COLORS[i]}`}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${BADGE_COLORS[i]}`}>{VERSION_LABELS[i]}</Badge>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyReview(review, i)}
                    className="h-7 text-xs"
                  >
                    {copiedIndex === i
                      ? <><Check className="h-3 w-3 mr-1 text-green-500" />복사됨</>
                      : <><Copy className="h-3 w-3 mr-1" />복사</>
                    }
                  </Button>
                </div>

                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  {review.title}
                </p>

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {review.content}
                </p>

                {review.tags && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">{review.tags}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* 작성 팁 */}
          {tips && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-300">후기 활용 팁</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{tips}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 생성
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
