"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Shield, ChevronDown, Copy, RefreshCw, Lightbulb, Target, MessageSquareQuote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { MonthlyUsageData } from "@/lib/subscription/usage"
import type { PlanLimits } from "@/lib/subscription/plans"

const OBJECTION_OPTIONS = [
  { value: "expensive", label: "보험료가 너무 비싸요" },
  { value: "already_have", label: "이미 보험이 있어요" },
  { value: "not_needed", label: "보험이 필요 없어요" },
  { value: "later", label: "나중에 생각해볼게요" },
  { value: "think_about", label: "좀 더 생각해봐야 해요" },
  { value: "spouse", label: "배우자와 상의해야 해요" },
  { value: "distrust", label: "보험은 믿기 어렵습니다" },
  { value: "young", label: "아직 젊어서 괜찮아요" },
  { value: "no_money", label: "지금 여유 자금이 없어요" },
  { value: "bad_experience", label: "예전에 안 좋은 경험이 있어요" },
  { value: "custom", label: "직접 입력" },
]

const AGENT_STYLES = [
  { value: "친근하고 전문적", label: "친근하고 전문적" },
  { value: "신뢰감 있고 차분한", label: "신뢰감 있고 차분한" },
  { value: "열정적이고 적극적인", label: "열정적이고 적극적인" },
  { value: "공감 중심의", label: "공감 중심의" },
  { value: "논리적이고 데이터 기반", label: "논리적이고 데이터 기반" },
]

interface Strategy {
  name: string
  situation: string
  script: string
  point: string
}

interface ObjectionHandlerProps {
  planName: string
  limits: PlanLimits
  usage: MonthlyUsageData
}

const STRATEGY_COLORS = [
  { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
]

export function ObjectionHandler({ planName, limits, usage }: ObjectionHandlerProps) {
  const [objectionType, setObjectionType] = useState("")
  const [customObjection, setCustomObjection] = useState("")
  const [productType, setProductType] = useState("")
  const [customerContext, setCustomerContext] = useState("")
  const [agentStyle, setAgentStyle] = useState("친근하고 전문적")
  const [loading, setLoading] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [tipText, setTipText] = useState("")
  const [usedObjection, setUsedObjection] = useState("")
  const [remaining, setRemaining] = useState(limits.scriptLimit - usage.scriptCount)

  async function handleGenerate() {
    if (!objectionType) { toast.error("거절 유형을 선택해주세요"); return }
    if (objectionType === "custom" && !customObjection.trim()) { toast.error("거절 멘트를 입력해주세요"); return }
    if (!productType.trim()) { toast.error("제안 상품을 입력해주세요"); return }

    setLoading(true)
    setStrategies([])
    setTipText("")

    try {
      const res = await fetch("/api/ai/objection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectionType, customObjection, productType, customerContext, agentStyle }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.limitExceeded) {
          toast.error("이번 달 사용 한도를 초과했습니다. 플랜을 업그레이드해주세요.")
        } else {
          toast.error(data.error ?? "생성에 실패했습니다")
        }
        return
      }

      setStrategies(data.strategies ?? [])
      setUsedObjection(data.objectionText ?? "")
      setRemaining(data.remaining ?? 0)

      // extract tip from rawText
      const tipMatch = (data.rawText as string)?.match(/\[추가팁\]\s*([\s\S]+)$/)
      if (tipMatch) setTipText(tipMatch[1].trim())

      if (data.cached) {
        toast.info("이전에 생성한 결과를 불러왔습니다")
      } else {
        toast.success("거절 극복 스크립트가 생성되었습니다!")
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} 복사 완료!`)
  }

  const scriptUsed = usage.scriptCount
  const scriptLimit = limits.scriptLimit

  return (
    <div className="space-y-6">
      {/* 사용량 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          스크립트 사용량 (거절 극복 포함):{" "}
          <span className="font-semibold text-gray-900">{scriptUsed} / {scriptLimit}회</span>
        </p>
        {scriptUsed >= scriptLimit && (
          <span className="text-xs text-red-600 font-medium">한도 초과 — 플랜 업그레이드 필요</span>
        )}
      </div>

      {/* 입력 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            상황 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 거절 유형 */}
            <div className="space-y-1.5">
              <Label>고객 거절 유형 <span className="text-red-500">*</span></Label>
              <select
                value={objectionType}
                onChange={e => setObjectionType(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">거절 유형 선택</option>
                {OBJECTION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* 제안 상품 */}
            <div className="space-y-1.5">
              <Label>제안 상품 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="예: 종신보험, 암보험, 실손보험..."
                value={productType}
                onChange={e => setProductType(e.target.value)}
              />
            </div>
          </div>

          {/* 직접 입력 */}
          {objectionType === "custom" && (
            <div className="space-y-1.5">
              <Label>고객 거절 멘트 직접 입력 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="고객이 한 말을 그대로 입력해주세요"
                value={customObjection}
                onChange={e => setCustomObjection(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* 고객 상황 */}
            <div className="space-y-1.5">
              <Label>고객 상황 <span className="text-gray-400 text-xs">(선택)</span></Label>
              <Input
                placeholder="예: 40대 직장인, 자녀 2명..."
                value={customerContext}
                onChange={e => setCustomerContext(e.target.value)}
              />
            </div>

            {/* 설계사 스타일 */}
            <div className="space-y-1.5">
              <Label>나의 상담 스타일</Label>
              <select
                value={agentStyle}
                onChange={e => setAgentStyle(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {AGENT_STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            size="lg"
          >
            {loading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />생성 중...</>
            ) : (
              <><MessageSquareQuote className="h-4 w-4 mr-2" />거절 극복 스크립트 생성</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 결과 */}
      {strategies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              &ldquo;{usedObjection}&rdquo; 극복 전략
            </h2>
            <Badge variant="outline" className="text-xs">{strategies.length}가지 전략</Badge>
          </div>

          {strategies.map((strategy, i) => {
            const color = STRATEGY_COLORS[i] ?? STRATEGY_COLORS[0]
            return (
              <Card key={i} className={`border ${color.border} ${color.bg}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.badge}`}>
                        전략 {i + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{strategy.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(strategy.script, `전략 ${i + 1}`)}
                      className="h-7 px-2 text-xs shrink-0"
                    >
                      <Copy className="h-3 w-3 mr-1" />복사
                    </Button>
                  </div>

                  {strategy.situation && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Target className="h-3 w-3" />
                      <span>{strategy.situation}</span>
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-white/60">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {strategy.script ? `"${strategy.script}"` : ""}
                    </p>
                  </div>

                  {strategy.point && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-yellow-500 shrink-0" />
                      <span>{strategy.point}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* 추가 팁 */}
          {tipText && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-sm text-yellow-800 dark:text-yellow-300">전문가 추가 팁</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{tipText}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(
                strategies.map((s, i) => `[전략 ${i + 1}: ${s.name}]\n"${s.script}"\n포인트: ${s.point}`).join('\n\n'),
                "전체 스크립트"
              )}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />전체 복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 생성
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
