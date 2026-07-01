"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Sparkles, Copy, Download, RefreshCw, CheckCircle, AlertCircle,
  Zap, Activity, Clock, Target, MessageCircle, Phone, ShieldAlert, Gauge,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAIGenerate } from "@/hooks/useAIGenerate"
import { OutputRater } from "@/components/ai/output-rater"
import { clientTrackFeatureStart, clientTrackDownload } from "@/lib/analytics/client-track"
import { INTERACTION_TYPE_LABELS, INTERACTION_SENTIMENT_LABELS, type CustomerInteraction } from "@/types"

const OUTPUT_TABS = [
  { key: "STATUS_ANALYSIS",  icon: Activity,       label: "고객 상태 분석" },
  { key: "TIMING",           icon: Clock,          label: "연락 적정 시점" },
  { key: "PURPOSE",          icon: Target,         label: "추천 연락 목적" },
  { key: "KAKAO_MESSAGES",   icon: MessageCircle,  label: "카톡 메시지" },
  { key: "CALL_OPENING",     icon: Phone,          label: "전화 오프닝" },
  { key: "CAUTIONS",         icon: ShieldAlert,    label: "주의할 점" },
  { key: "CLOSING_LIKELIHOOD", icon: Gauge,        label: "클로징 가능성" },
] as const

type TabKey = typeof OUTPUT_TABS[number]["key"]

interface CustomerInfo {
  id: string
  name: string
  statusLabel: string
  interestProducts: string[]
}

interface Props {
  initialUsage: number
  limit: number
  planName: string
  customer: CustomerInfo
  interactions: CustomerInteraction[]
}

export function FollowupRecommender({ initialUsage, limit, planName, customer, interactions }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("STATUS_ANALYSIS")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { state, generate } = useAIGenerate(
    Math.max(0, limit - initialUsage),
    { endpoint: "/api/ai/followup", minIntervalMs: 1000, maxRetries: 1 }
  )

  const isLoading = state.status === "loading"
  const isLimitReached = state.remaining === 0
  const sections: Record<string, string> = (state.result as unknown as { sections?: Record<string, string> })?.sections ?? {}
  const hasResult = state.status === "success" && Object.keys(sections).length > 0

  useEffect(() => {
    if (state.status === "success" && hasResult) {
      if (state.cached) toast.info("이전에 생성된 결과를 불러왔습니다")
      else toast.success("후속 연락 추천이 생성되었습니다!")
    }
    if (state.status === "error" && state.error) {
      toast.error(state.error)
    }
  }, [state.status, state.cached, state.error, hasResult])

  function handleGenerate(forceRegenerate = false) {
    if (isLimitReached) { toast.error("이번 달 사용 한도를 초과했습니다"); return }
    clientTrackFeatureStart("ai_followup", { customerId: customer.id, regenerate: forceRegenerate })
    generate({ customerId: customer.id, forceRegenerate })
  }

  async function handleCopy(key: string) {
    const text = sections[key] ?? ""
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("클립보드에 복사되었습니다")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  async function handleCopyAll() {
    const all = OUTPUT_TABS
      .map(t => `【${t.label}】\n${sections[t.key] ?? "(생성되지 않음)"}`)
      .join("\n\n" + "─".repeat(40) + "\n\n")
    await navigator.clipboard.writeText(all)
    toast.success("전체 추천 결과가 복사되었습니다")
  }

  function handleDownload() {
    const allText = OUTPUT_TABS
      .map(t => `【${t.label}】\n${sections[t.key] ?? "(생성되지 않음)"}`)
      .join("\n\n" + "═".repeat(50) + "\n\n")
    const header = `AI 후속 연락 추천\n생성일: ${new Date().toLocaleDateString("ko-KR")}\n고객: ${customer.name}\n\n${"═".repeat(50)}\n\n`
    const blob = new Blob([header + allText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `후속연락추천_${customer.name}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("TXT 파일이 다운로드되었습니다")
    clientTrackDownload("result", { feature: "ai_followup", customerId: customer.id })
  }

  const usedCount = limit - state.remaining

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
      {/* ── 고객 요약 / 입력 영역 ─────────────────────────── */}
      <div className="space-y-4">
        <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
          isLimitReached ? "bg-red-50 border-red-200 text-red-700" :
          state.remaining <= 3 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
          "bg-purple-50 border-purple-100 text-purple-700"
        }`}>
          <span>이번 달 사용량 <strong>{usedCount}/{limit}회</strong> <span className="opacity-70">({planName} 플랜)</span></span>
          {isLimitReached && <Badge variant="destructive" className="text-xs">한도 초과</Badge>}
          {!isLimitReached && state.remaining <= 3 && <Badge className="text-xs bg-yellow-500 text-white">{state.remaining}회 남음</Badge>}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">{customer.name}</h2>
              <Badge variant="outline">{customer.statusLabel}</Badge>
            </div>
            {customer.interestProducts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customer.interestProducts.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">최근 상담 이력 ({interactions.length}건)</p>
              {interactions.length === 0 ? (
                <p className="text-xs text-gray-400">등록된 상담 이력이 없습니다</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {interactions.map(it => (
                    <div key={it.id} className="text-xs bg-gray-50 border rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{INTERACTION_TYPE_LABELS[it.interaction_type]}</span>
                        <span className="text-gray-400">{new Date(it.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{it.title}</p>
                      <span className="text-gray-400">{INTERACTION_SENTIMENT_LABELS[it.sentiment]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => handleGenerate(false)}
          disabled={isLoading || isLimitReached}
          className="w-full h-11 text-sm bg-[#1e3a5f] hover:bg-[#162d4a]"
        >
          {isLoading ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />AI가 추천 결과 생성 중...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" />후속 연락 추천 받기</>
          )}
        </Button>

        {state.status === "error" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}
      </div>

      {/* ── 결과 ────────────────────────────────────────── */}
      <div className="space-y-3 min-w-0">
        <Card className="min-h-[600px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
              <span className="text-base font-semibold">추천 결과</span>
              {hasResult && (
                <div className="flex flex-wrap gap-1.5">
                  {state.cached && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Zap className="h-3 w-3" /> 캐시
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleCopyAll} className="h-7 px-2 text-xs">
                    <Copy className="h-3.5 w-3.5 mr-1" />전체복사
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 px-2 text-xs">
                    <Download className="h-3.5 w-3.5 mr-1" />TXT
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[480px] space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                <p className="text-sm text-gray-500">AI가 후속 연락 전략을 분석하고 있습니다...</p>
                <p className="text-xs text-gray-400">상태분석·연락시점·연락목적·카톡메시지·전화오프닝·주의사항·클로징가능성</p>
              </div>
            ) : hasResult ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {OUTPUT_TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isActive
                            ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {OUTPUT_TABS.map(tab => (
                  activeTab === tab.key && (
                    <div key={tab.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">{tab.label}</span>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleCopy(tab.key)}
                          className="h-7 px-2 text-xs text-gray-500"
                        >
                          {copiedKey === tab.key
                            ? <><CheckCircle className="h-3.5 w-3.5 text-green-500 mr-1" />복사됨</>
                            : <><Copy className="h-3.5 w-3.5 mr-1" />복사</>}
                        </Button>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[380px] border">
                        {sections[tab.key] ?? ""}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[480px] text-gray-400 space-y-3">
                <Sparkles className="h-12 w-12 text-gray-200" />
                <p className="text-sm">&ldquo;후속 연락 추천 받기&rdquo;를 클릭하면</p>
                <p className="text-sm">고객 맞춤 연락 전략이 생성됩니다</p>
                <div className="flex flex-wrap gap-1.5 mt-2 justify-center max-w-sm">
                  {OUTPUT_TABS.map(t => {
                    const Icon = t.icon
                    return (
                      <span key={t.key} className="flex items-center gap-1 text-xs text-gray-300 bg-gray-50 px-2 py-1 rounded-full border">
                        <Icon className="h-3 w-3" />{t.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {hasResult && (
          <Button
            variant="outline"
            onClick={() => handleGenerate(true)}
            disabled={isLoading}
            className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 text-sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            다시 생성하기 (새로 생성 — 사용량 차감)
          </Button>
        )}

        {state.provider && hasResult && (
          <p className="text-xs text-gray-400 text-center">
            {state.cached ? "캐시에서 불러옴" : `${state.provider} 모델로 생성됨`}
          </p>
        )}

        {hasResult && (
          <OutputRater
            featureType="ai_followup"
            outputId={null}
            promptVersion={(state as any).promptVersion ?? null}
          />
        )}
      </div>
    </div>
  )
}
