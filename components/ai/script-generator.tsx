"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Sparkles, Copy, Download, RefreshCw, CheckCircle, AlertCircle,
  Zap, Bookmark, BookmarkCheck, BookOpen,
  ClipboardList, Handshake, Coffee, HelpCircle, Lightbulb,
  Package, Users, ShieldAlert, CheckSquare, MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAIGenerate } from "@/hooks/useAIGenerate"
import { clientTrackFeatureStart, clientTrackDownload } from "@/lib/analytics/client-track"
import { CategorySelect } from "@/components/ai/category-select"

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDERS = ["남성", "여성", "미입력"]
const AGE_GROUPS = ["20대", "30대", "40대", "50대", "60대 이상"]
const OCCUPATIONS = ["직장인", "자영업자", "공무원", "전문직", "주부", "학생", "은퇴자", "기타"]
const MARITAL_STATUSES = ["미혼", "기혼", "이혼/별거", "사별"]
const CHILDREN_OPTIONS = ["없음", "1명", "2명", "3명 이상"]
const INCOME_LEVELS = ["200만원 미만", "200~400만원", "400~600만원", "600만원 이상", "미입력"]
const PRODUCT_INTERESTS = [
  "종신보험", "건강보험", "실손보험", "암보험", "자동차보험",
  "연금보험", "저축보험", "어린이보험", "CI보험", "기타",
]
const CONSULTATION_PURPOSES = [
  "신규 계약 유치", "기존 계약 갱신", "추가 상품 안내",
  "해지 방어", "보장 분석", "리모델링",
]
const PERSONALITIES = [
  "분석형 (꼼꼼하게 따짐)", "감성형 (관계 중시)", "가격중시형 (비용 민감)",
  "바쁜형 (시간 없음)", "불신형 (보험에 부정적)", "긍정형 (이미 관심 있음)",
]
const AGENT_STYLES = ["친근하고 따뜻하게", "전문적이고 논리적으로", "간결하고 핵심만", "스토리텔링 방식"]

const OUTPUT_TABS = [
  { key: "PREP",      icon: ClipboardList, label: "상담 전 준비",      color: "slate" },
  { key: "GREETING",  icon: Handshake,     label: "첫 인사",            color: "blue" },
  { key: "ICEBREAK",  icon: Coffee,        label: "아이스브레이킹",     color: "amber" },
  { key: "NEEDS",     icon: HelpCircle,    label: "니즈 파악",          color: "purple" },
  { key: "AWARENESS", icon: Lightbulb,     label: "문제 인식",          color: "orange" },
  { key: "PRODUCT",   icon: Package,       label: "상품 설명",          color: "teal" },
  { key: "PERSONA",   icon: Users,         label: "유형별 설득",        color: "indigo" },
  { key: "OBJECTION", icon: ShieldAlert,   label: "반론 대응",          color: "red" },
  { key: "CLOSING",   icon: CheckSquare,   label: "클로징",             color: "green" },
  { key: "FOLLOWUP",  icon: MessageSquare, label: "후속 문자",          color: "cyan" },
] as const

type TabKey = typeof OUTPUT_TABS[number]["key"]

interface InitialData {
  customerId?: string
  customerName?: string
  gender?: string
  ageGroup?: string
  occupation?: string
  maritalStatus?: string
  hasChildren?: string
  incomeLevel?: string
  productInterest?: string
  extraNotes?: string
  expectedObjections?: string
}

interface Props {
  initialUsage: number
  limit: number
  planName: string
  initialData?: InitialData
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScriptGenerator({ initialUsage, limit, planName, initialData }: Props) {
  // Form state
  const [customerName, setCustomerName] = useState(initialData?.customerName ?? "")
  const [gender, setGender] = useState(initialData?.gender ?? "")
  const [ageGroup, setAgeGroup] = useState(initialData?.ageGroup ?? "")
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "")
  const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus ?? "")
  const [hasChildren, setHasChildren] = useState(initialData?.hasChildren ?? "")
  const [incomeLevel, setIncomeLevel] = useState(initialData?.incomeLevel ?? "")
  const [existingInsurance, setExistingInsurance] = useState("")
  const [productInterest, setProductInterest] = useState(initialData?.productInterest ?? "")
  const [consultationPurpose, setConsultationPurpose] = useState("")
  const [customerPersonality, setCustomerPersonality] = useState("")
  const [expectedObjections, setExpectedObjections] = useState(initialData?.expectedObjections ?? "")
  const [agentStyle, setAgentStyle] = useState("친근하고 따뜻하게")
  const [extraNotes, setExtraNotes] = useState(initialData?.extraNotes ?? "")
  const [categoryId, setCategoryId] = useState("")

  // Result state
  const [activeTab, setActiveTab] = useState<TabKey>("PREP")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const { state, generate } = useAIGenerate(
    Math.max(0, limit - initialUsage),
    { endpoint: "/api/ai/script", minIntervalMs: 1000, maxRetries: 1 }
  )

  const isLoading = state.status === "loading"
  const isLimitReached = state.remaining === 0
  const sections: Record<string, string> = (state.result as unknown as { sections?: Record<string, string> })?.sections ?? {}
  const hasResult = state.status === "success" && Object.keys(sections).length > 0

  useEffect(() => {
    if (state.status === "success" && hasResult) {
      if (state.cached) toast.info("이전에 생성된 결과를 불러왔습니다")
      else toast.success("상담 스크립트 10개 섹션이 생성되었습니다!")
      setSavedId(null)
      setIsFavorite(false)
    }
    if (state.status === "error" && state.error) {
      toast.error(state.error)
    }
  }, [state.status, state.cached, state.error, hasResult])

  function buildParams(forceRegenerate = false) {
    return {
      customerName, gender, ageGroup, occupation, maritalStatus, hasChildren,
      incomeLevel, existingInsurance, productInterest, consultationPurpose,
      customerPersonality, expectedObjections, agentStyle, extraNotes, categoryId, forceRegenerate,
    }
  }

  function handleGenerate() {
    if (!productInterest) { toast.error("관심 상품을 선택해주세요"); return }
    if (!consultationPurpose) { toast.error("상담 목적을 선택해주세요"); return }
    if (isLimitReached) { toast.error("이번 달 사용 한도를 초과했습니다"); return }
    clientTrackFeatureStart("ai_script", { productInterest, consultationPurpose })
    generate(buildParams(false))
  }

  function handleRegenerate() {
    if (!productInterest || !consultationPurpose) return
    clientTrackFeatureStart("ai_script", { productInterest, consultationPurpose, regenerate: true })
    generate(buildParams(true))
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
    toast.success("전체 스크립트가 복사되었습니다")
  }

  function handleDownload() {
    const allText = OUTPUT_TABS
      .map(t => `【${t.label}】\n${sections[t.key] ?? "(생성되지 않음)"}`)
      .join("\n\n" + "═".repeat(50) + "\n\n")
    const header = `AI 상담 스크립트\n생성일: ${new Date().toLocaleDateString("ko-KR")}\n고객: ${customerName || "고객"} | 상품: ${productInterest} | 목적: ${consultationPurpose}\n\n${"═".repeat(50)}\n\n`
    const blob = new Blob([header + allText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `상담스크립트_${productInterest}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("TXT 파일이 다운로드되었습니다")
    clientTrackDownload("result", { feature: "ai_script", productInterest })
  }

  const handleSave = useCallback(async () => {
    if (isSaving || !hasResult) return
    setIsSaving(true)
    try {
      const outputText = OUTPUT_TABS.map(t => `[${t.key}]\n${sections[t.key] ?? ""}`).join("\n\n")
      const res = await fetch("/api/outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "script",
          title: `${productInterest} - ${consultationPurpose} (${customerName || "고객"})`,
          inputData: buildParams(),
          outputText,
          promptVersion: (state as unknown as { promptVersion?: string }).promptVersion,
          aiProvider: state.provider,
          model: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedId(data.id)
      toast.success("저장되었습니다")
    } catch {
      toast.error("저장에 실패했습니다")
    } finally {
      setIsSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, isSaving, sections, productInterest, consultationPurpose, customerName, state.provider])

  async function handleFavoriteToggle() {
    if (!savedId) { await handleSave(); return }
    const next = !isFavorite
    try {
      await fetch("/api/outputs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId, isFavorite: next }),
      })
      setIsFavorite(next)
      toast.success(next ? "즐겨찾기에 추가되었습니다" : "즐겨찾기에서 제거되었습니다")
    } catch {
      toast.error("업데이트에 실패했습니다")
    }
  }

  const usedCount = limit - state.remaining

  // ─── Helper: chip selector ────────────────────────────────────────────────

  function ChipSelect({
    label, required, value, onChange, options, columns = 3,
  }: {
    label: string; required?: boolean; value: string
    onChange: (v: string) => void; options: string[]; columns?: number
  }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className={`grid gap-1.5 grid-cols-${columns}`}>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(value === opt ? "" : opt)}
              disabled={isLoading}
              className={`px-2 py-1.5 rounded-lg text-xs border transition-all text-left disabled:opacity-50 ${
                value === opt
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
      {/* ── 입력 폼 ─────────────────────────────────────── */}
      <div className="space-y-4 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto xl:pr-2">
        {/* 사용량 */}
        <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
          isLimitReached ? "bg-red-50 border-red-200 text-red-700" :
          state.remaining <= 3 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
          "bg-purple-50 border-purple-100 text-purple-700"
        }`}>
          <span>이번 달 사용량 <strong>{usedCount}/{limit}회</strong> <span className="opacity-70">({planName} 플랜)</span></span>
          {isLimitReached && <Badge variant="destructive" className="text-xs">한도 초과</Badge>}
          {!isLimitReached && state.remaining <= 3 && <Badge className="text-xs bg-yellow-500 text-white">{state.remaining}회 남음</Badge>}
        </div>

        {initialData?.customerId && (
          <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>고객 정보 &ldquo;{initialData.customerName}&rdquo;가 자동으로 입력되었습니다</span>
          </div>
        )}

        {/* 필수: 관심 상품 + 상담 목적 */}
        <ChipSelect label="관심 상품" required value={productInterest} onChange={setProductInterest} options={PRODUCT_INTERESTS} columns={3} />
        <ChipSelect label="상담 목적" required value={consultationPurpose} onChange={setConsultationPurpose} options={CONSULTATION_PURPOSES} columns={2} />

        <CategorySelect value={categoryId} onChange={setCategoryId} disabled={isLoading} />

        <hr className="border-gray-100" />

        {/* 고객 기본 정보 */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">고객 기본 정보</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">고객 이름</Label>
            <Input placeholder="예: 홍길동" value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isLoading} className="h-8 text-xs" />
          </div>
          <ChipSelect label="성별" value={gender} onChange={setGender} options={GENDERS} columns={3} />
        </div>
        <ChipSelect label="연령대" value={ageGroup} onChange={setAgeGroup} options={AGE_GROUPS} columns={5} />
        <ChipSelect label="직업" value={occupation} onChange={setOccupation} options={OCCUPATIONS} columns={4} />

        <div className="grid grid-cols-2 gap-3">
          <ChipSelect label="결혼 여부" value={maritalStatus} onChange={setMaritalStatus} options={MARITAL_STATUSES} columns={2} />
          <ChipSelect label="자녀 여부" value={hasChildren} onChange={setHasChildren} options={CHILDREN_OPTIONS} columns={2} />
        </div>

        <ChipSelect label="소득 수준" value={incomeLevel} onChange={setIncomeLevel} options={INCOME_LEVELS} columns={2} />

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">기존 보험 여부</Label>
          <Input
            placeholder="예: 실손+암보험 가입, 종신보험 없음"
            value={existingInsurance}
            onChange={e => setExistingInsurance(e.target.value)}
            disabled={isLoading}
            className="h-8 text-xs"
          />
        </div>

        <hr className="border-gray-100" />

        {/* 상담 전략 */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">상담 전략</p>
        <ChipSelect label="고객 성향" value={customerPersonality} onChange={setCustomerPersonality} options={PERSONALITIES} columns={1} />
        <ChipSelect label="설계사 스타일" value={agentStyle} onChange={setAgentStyle} options={AGENT_STYLES} columns={2} />

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">예상 반론</Label>
          <Textarea
            placeholder="예: 보험료가 비싸다, 이미 보험이 많다, 나중에 생각해보겠다"
            value={expectedObjections}
            onChange={e => setExpectedObjections(e.target.value)}
            disabled={isLoading}
            className="min-h-[60px] resize-none text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">추가 메모</Label>
          <Textarea
            placeholder="예: 최근 부모님이 암 진단을 받으셨다고 함. 건강 관련 관심도 높음."
            value={extraNotes}
            onChange={e => setExtraNotes(e.target.value)}
            disabled={isLoading}
            className="min-h-[60px] resize-none text-xs"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isLoading || isLimitReached}
          className="w-full h-11 text-sm bg-[#1e3a5f] hover:bg-[#162d4a]"
        >
          {isLoading ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />AI가 스크립트 생성 중...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" />상담 스크립트 생성하기</>
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
              <span className="text-base font-semibold">생성된 상담 스크립트</span>
              {hasResult && (
                <div className="flex flex-wrap gap-1.5">
                  {state.cached && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Zap className="h-3 w-3" /> 캐시
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleFavoriteToggle} className="h-7 px-2 text-xs">
                    {isFavorite ? <><BookmarkCheck className="h-3.5 w-3.5 text-orange-500 mr-1" />즐겨찾기</> : <><Bookmark className="h-3.5 w-3.5 mr-1" />즐겨찾기</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || !!savedId} className="h-7 px-2 text-xs">
                    {savedId ? <><CheckCircle className="h-3.5 w-3.5 text-green-500 mr-1" />저장됨</> : "저장"}
                  </Button>
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
                <p className="text-sm text-gray-500">AI가 상담 스크립트를 작성하고 있습니다...</p>
                <p className="text-xs text-gray-400">준비·인사·아이스브레이킹·니즈파악·문제인식·상품설명·설득·반론·클로징·후속문자</p>
              </div>
            ) : hasResult ? (
              <div className="space-y-3">
                {/* Tab buttons — 2 rows */}
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

                {/* Active tab content */}
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
                <BookOpen className="h-12 w-12 text-gray-200" />
                <p className="text-sm">관심 상품과 상담 목적을 선택하고</p>
                <p className="text-sm">&ldquo;상담 스크립트 생성하기&rdquo;를 클릭하세요</p>
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
            onClick={handleRegenerate}
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
      </div>
    </div>
  )
}
