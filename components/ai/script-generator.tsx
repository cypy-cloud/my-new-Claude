"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  Sparkles, Copy, Download, RefreshCw, CheckCircle, AlertCircle,
  Zap, Bookmark, BookmarkCheck, BookOpen,
  ClipboardList, Handshake, Coffee, HelpCircle, Lightbulb,
  Package, Users, ShieldAlert, CheckSquare, MessageSquare,
  Mic, MicOff, Loader2, Calculator, Brain, ChevronDown, ChevronUp,
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
import { UsageWarningBanner } from "@/components/billing/usage-limit-banner"
import { OutputRater } from "@/components/ai/output-rater"
import { SafetyCheckDisplay } from "@/components/ai/safety-check-display"

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

// 리크루팅 후보 대상 상담 스크립트 — 고객 불러오기에서 "리크루팅 후보"를 선택하면 자동 전환
const RECRUIT_APPEAL_POINTS = ["수입 구조", "시간 자유도", "자기계발/성장", "여성 친화적 근무환경", "정년 없음", "본사 지원 시스템", "기타"]
const RECRUIT_CONSULTATION_PURPOSES = ["리크루팅 제안 상담", "설명회 초대 상담", "커리어 전환 상담", "복직 제안 상담", "부업/투잡 제안 상담"]
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
  mbtiType?: string
  expectedObjections?: string
  contactType?: "customer" | "recruit"
}

interface Props {
  initialUsage: number
  limit: number
  planName: string
  planId?: string
  initialData?: InitialData
  pensionData?: Record<string, string>
}

// 연금계산기 데이터를 extraNotes 문자열로 변환
function buildPensionNote(p: Record<string, string>): string {
  const fmt = (v: string, unit = "만원") => v ? `${Number(v).toLocaleString()}${unit}` : "-"
  return [
    `[연금계산기 분석 결과]`,
    `현재 나이: ${p.current_age}세 / 은퇴 목표: ${p.retire_age}세 / 기대 수명: ${p.life_expectancy}세`,
    `은퇴 후 월 생활비: ${fmt(p.monthly_expense)} / 국민연금 예상: ${fmt(p.national_pension)}`,
    `현재 저축액: ${fmt(p.current_savings)} / 월 저축 가능액: ${fmt(p.monthly_contrib)}`,
    `은퇴 시 필요 총자산: ${fmt(p.total_needed)} / 예상 부족액: ${fmt(p.shortfall)}`,
    `은퇴 준비율: ${Number(p.preparedness_rate).toFixed(0)}% / 추가 필요 월 저축: ${fmt(p.additional_monthly)}`,
  ].join("\n")
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScriptGenerator({ initialUsage, limit, planName, planId, initialData, pensionData }: Props) {
  // 고객을 불러온 경우 그 구분(customer/recruit)을 기본값으로 쓰되, 고객 불러오기 없이도
  // 수동으로 전환할 수 있도록 상태로 관리
  const [isRecruit, setIsRecruit] = useState(initialData?.contactType === "recruit")
  const appealOptions = isRecruit ? RECRUIT_APPEAL_POINTS : PRODUCT_INTERESTS
  const appealLabel = isRecruit ? "제안 포인트" : "관심 상품"
  const purposeOptions = isRecruit ? RECRUIT_CONSULTATION_PURPOSES : CONSULTATION_PURPOSES

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

  function toggleRecruitMode(next: boolean) {
    setIsRecruit(next)
    setProductInterest("")
    setConsultationPurpose("")
  }
  const [customerPersonality, setCustomerPersonality] = useState("")
  const [expectedObjections, setExpectedObjections] = useState(initialData?.expectedObjections ?? "")
  const [agentStyle, setAgentStyle] = useState("친근하고 따뜻하게")
  const [extraNotes, setExtraNotes] = useState(initialData?.extraNotes ?? "")
  const [categoryId, setCategoryId] = useState("")
  const [mbtiType, setMbtiType] = useState(initialData?.mbtiType ?? "")

  // 고객관리에 등록된 고객 목록 불러오기 — URL로 customerId 없이 이 화면에 직접 들어온 경우에도
  // 등록된 고객을 바로 선택해서 정보를 채울 수 있도록 함 (customer-analysis.tsx와 동일 패턴)
  const [customers, setCustomers] = useState<Array<{
    id: string; name: string; phone: string | null; gender: string | null; age_group: string | null
    job: string | null; family_status: string | null; children_status: string | null
    income_level: string | null; interest_products: string[]; memo: string | null
    contact_type: "customer" | "recruit"; mbti_type: string | null
  }>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.customerId ?? "")

  useEffect(() => {
    fetch("/api/customers")
      .then(res => res.json())
      .then(data => setCustomers(data.customers ?? []))
      .catch(() => {})
  }, [])

  function handleSelectCustomer(id: string) {
    setSelectedCustomerId(id)
    if (!id) return
    const c = customers.find(x => x.id === id)
    if (!c) return

    const recruit = c.contact_type === "recruit"
    setIsRecruit(recruit)
    setConsultationPurpose("")
    setCustomerName(c.name ?? "")
    if (c.gender === "남성" || c.gender === "여성") setGender(c.gender)
    if (c.age_group) setAgeGroup(c.age_group)
    if (c.job) setOccupation(c.job)
    if (c.family_status) setMaritalStatus(c.family_status)
    if (c.children_status) setHasChildren(c.children_status)
    if (c.income_level) setIncomeLevel(c.income_level)
    setProductInterest(recruit ? "" : (Array.isArray(c.interest_products) ? (c.interest_products[0] ?? "") : ""))
    setExtraNotes(c.memo ?? "")
    setMbtiType(c.mbti_type ?? "")
  }

  // 고객성향분석 결과 불러오기
  const [analysisResults, setAnalysisResults] = useState<Array<{ id: string; title: string; output_text: string; created_at: string; input_data?: Record<string, string> }>>([])
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null)
  const [selectedAnalysisText, setSelectedAnalysisText] = useState("")

  async function loadAnalysisResults() {
    if (analysisResults.length > 0) { setAnalysisOpen(o => !o); return }
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/outputs?type=script&limit=20')
      const data = await res.json()
      // 고객성향분석으로 저장된 것만 필터 (저장 제목: "고객 성향 분석: ...")
      const filtered = (data.outputs ?? []).filter((o: any) =>
        o.title?.includes('성향 분석') || o.title?.includes('성향분석') || o.title?.includes('고객분석')
      )
      setAnalysisResults(filtered)
      setAnalysisOpen(true)
    } catch {
      toast.error('분석 결과를 불러오지 못했습니다')
    } finally {
      setAnalysisLoading(false)
    }
  }

  // 고객성향분석에서 저장한 기초 정보를 상담 스크립트 필드로 변환 (값 체계가 서로 달라 안전하게 매핑 가능한 항목만)
  function mapAnalysisInputToScriptFields(input: Record<string, string>) {
    let maritalStatusMapped = ''
    let hasChildrenMapped = ''
    if (input.familyStatus === '미혼') maritalStatusMapped = '미혼'
    else if (input.familyStatus === '기혼 (자녀 없음)') { maritalStatusMapped = '기혼'; hasChildrenMapped = '없음' }
    else if (input.familyStatus === '기혼 (자녀 있음)') maritalStatusMapped = '기혼'
    else if (input.familyStatus === '이혼/사별') maritalStatusMapped = '이혼/별거'

    return {
      gender: input.gender ?? '',
      ageGroup: input.ageGroup ? input.ageGroup.replace(/\s*(초반|후반)$/, '') : '',
      occupation: input.occupation ?? '',
      maritalStatus: maritalStatusMapped,
      hasChildren: hasChildrenMapped,
      existingInsurance: input.existingInsurance ?? '',
    }
  }

  function applyAnalysis(r: { id: string; title: string; output_text: string; input_data?: Record<string, string> }) {
    setSelectedAnalysis(r.id)
    setSelectedAnalysisText(r.output_text)
    setAnalysisOpen(false)

    if (r.input_data?.customerName && !customerName) setCustomerName(r.input_data.customerName)

    if (r.input_data) {
      const mapped = mapAnalysisInputToScriptFields(r.input_data)
      if (mapped.gender) setGender(mapped.gender)
      if (mapped.ageGroup) setAgeGroup(mapped.ageGroup)
      if (mapped.occupation) setOccupation(mapped.occupation)
      if (mapped.maritalStatus) setMaritalStatus(mapped.maritalStatus)
      if (mapped.hasChildren) setHasChildren(mapped.hasChildren)
      if (mapped.existingInsurance) setExistingInsurance(mapped.existingInsurance)
    }

    toast.success(`"${r.title}" 분석 결과가 반영되었습니다 — 고객 기본 정보도 함께 채워졌습니다`)
  }

  // pensionData는 별도 고정 표시 (extraNotes와 합쳐서 API로만 전달)
  const pensionNote = pensionData ? buildPensionNote(pensionData) : ""

  // Voice input state
  const [voiceTarget, setVoiceTarget] = useState<"objection" | "notes" | null>(null)
  const [isCorrectingVoice, setIsCorrectingVoice] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef<string>("")

  async function correctVoiceInput(rawText: string, target: "objection" | "notes") {
    if (!rawText.trim()) return
    setIsCorrectingVoice(true)
    try {
      const res = await fetch("/api/ai/voice-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, context: { purpose: consultationPurpose, productField: productInterest, tone: agentStyle } }),
      })
      const data = await res.json()
      const corrected = res.ok ? data.corrected : rawText
      if (target === "objection") setExpectedObjections(prev => prev ? prev + " " + corrected : corrected)
      else setExtraNotes(prev => prev ? prev + " " + corrected : corrected)
    } catch {
      if (target === "objection") setExpectedObjections(prev => prev ? prev + " " + rawText : rawText)
      else setExtraNotes(prev => prev ? prev + " " + rawText : rawText)
    } finally {
      setIsCorrectingVoice(false)
    }
  }

  function stopVoiceRecording(target: "objection" | "notes") {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    setVoiceTarget(null)
    if (transcriptRef.current) {
      correctVoiceInput(transcriptRef.current, target)
      transcriptRef.current = ""
    }
  }

  function toggleVoice(target: "objection" | "notes") {
    if (voiceTarget === target) { stopVoiceRecording(target); return }
    if (voiceTarget) { stopVoiceRecording(voiceTarget) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error("이 브라우저는 음성 입력을 지원하지 않습니다."); return }

    transcriptRef.current = ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = "ko-KR"; rec.continuous = true; rec.interimResults = true
    rec.onresult = (e: any) => {
      let final = ""
      for (let i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript }
      if (final) transcriptRef.current = final
    }
    rec.onerror = (e: any) => {
      if (e.error !== "aborted") toast.error("음성 인식 오류가 발생했습니다.")
      recognitionRef.current = null; setVoiceTarget(null)
    }
    rec.onend = () => {
      recognitionRef.current = null; setVoiceTarget(null)
      if (transcriptRef.current) { correctVoiceInput(transcriptRef.current, target); transcriptRef.current = "" }
    }
    recognitionRef.current = rec
    try {
      rec.start(); setVoiceTarget(target)
      toast.info("🎤 녹음 중... 말씀 후 [녹음 중지] 버튼을 눌러주세요")
    } catch { toast.error("마이크 권한을 확인해주세요."); recognitionRef.current = null }
  }

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
      customerPersonality, expectedObjections, agentStyle,
      contactType: isRecruit ? "recruit" : "customer",
      mbtiType,
      extraNotes: [
        selectedAnalysisText ? `[고객성향분석 결과]\n${selectedAnalysisText}` : '',
        extraNotes,
        pensionNote,
      ].filter(Boolean).join("\n\n"),
      categoryId, forceRegenerate,
    }
  }

  function handleGenerate() {
    if (!productInterest) { toast.error(`${appealLabel}을 선택해주세요`); return }
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
      <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-2">
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

        <UsageWarningBanner
          featureLabel="AI 스크립트"
          used={usedCount}
          limit={limit}
          recommendedPlanId={planId === 'basic' ? 'pro' : planId === 'pro' ? 'premium' : null}
          inline
        />

        {customers.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">기존 고객 불러오기 <span className="text-gray-400 font-normal">(선택)</span></Label>
            <select
              value={selectedCustomerId}
              onChange={e => handleSelectCustomer(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">직접 입력</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` (${c.phone})` : ""}{c.contact_type === "recruit" ? " · 리크루팅 후보" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCustomerId && customerName && (
          <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>
              고객 정보 &ldquo;{customerName}&rdquo;가 자동으로 입력되었습니다
              {mbtiType && ` · MBTI(${mbtiType})에 맞춰 문체가 자동 조정됩니다`}
            </span>
          </div>
        )}

        {/* 스크립트 종류 — 고객을 안 불러온 경우에도 여기서 바로 리크루팅 상담으로 전환 가능 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">스크립트 종류</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleRecruitMode(false)}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 ${
                !isRecruit ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              일반 고객 상담
            </button>
            <button
              type="button"
              onClick={() => toggleRecruitMode(true)}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 ${
                isRecruit ? "bg-purple-700 text-white border-purple-700" : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
              }`}
            >
              리크루팅 제안 상담
            </button>
          </div>
        </div>

        {isRecruit && (
          <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>리크루팅 후보용 상담 스크립트로 작성됩니다</span>
          </div>
        )}

        {/* 고객성향분석 결과 불러오기 — 가장 먼저 선택하면 고객 기본 정보가 자동으로 채워짐 */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={loadAnalysisResults}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors text-sm text-purple-700"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="font-medium">고객성향분석 결과 불러오기 <span className="text-purple-400 font-normal">(선택 — MBTI보다 훨씬 깊은 맞춤 분석)</span></span>
              {selectedAnalysis && <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full">반영됨</span>}
            </div>
            {analysisLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : analysisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            }
          </button>

          {analysisOpen && (
            <div className="border border-purple-200 rounded-lg overflow-hidden">
              {analysisResults.length === 0 ? (
                <div className="px-3 py-4 text-xs text-gray-500 text-center">
                  저장된 고객성향분석 결과가 없습니다.<br />
                  고객성향분석 후 결과를 먼저 저장해주세요.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {analysisResults.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => applyAnalysis(r)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-purple-50 transition-colors ${selectedAnalysis === r.id ? 'bg-purple-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-800 truncate">{r.title}</p>
                        {selectedAnalysis === r.id && <CheckCircle className="h-3.5 w-3.5 text-purple-500 shrink-0 ml-1" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleDateString('ko-KR')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedAnalysisText && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-800 leading-relaxed line-clamp-3">
              {selectedAnalysisText.slice(0, 120)}...
              <button type="button" onClick={() => { setSelectedAnalysis(null); setSelectedAnalysisText('') }} className="ml-2 text-purple-400 hover:text-purple-600 underline">해제</button>
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* 필수: 관심 상품(또는 제안 포인트) + 상담 목적 */}
        <ChipSelect label={appealLabel} required value={productInterest} onChange={setProductInterest} options={appealOptions} columns={3} />
        <ChipSelect label="상담 목적" required value={consultationPurpose} onChange={setConsultationPurpose} options={purposeOptions} columns={2} />

        {!isRecruit && <CategorySelect value={categoryId} onChange={setCategoryId} disabled={isLoading} />}

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

        {/* 고객 성향 — 성향분석 결과가 선택되면 비활성화 */}
        <div className={selectedAnalysis ? 'opacity-40 pointer-events-none select-none' : ''}>
          {selectedAnalysis && (
            <p className="text-xs text-purple-500 mb-1">성향분석 결과 적용 중 — 아래 선택 비활성화</p>
          )}
          <ChipSelect label="고객 성향" value={customerPersonality} onChange={(v) => {
            setCustomerPersonality(v)
            // 수동 성향 선택 시 성향분석 결과 해제
            if (v) { setSelectedAnalysis(null); setSelectedAnalysisText('') }
          }} options={PERSONALITIES} columns={1} />
        </div>

        <ChipSelect label="설계사 스타일" value={agentStyle} onChange={setAgentStyle} options={AGENT_STYLES} columns={2} />

        {/* 연금계산기 분석 결과 고정 표시 */}
        {pensionNote && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-blue-500" />
              <Label className="text-xs font-medium text-blue-700">연금계산기 분석 결과 (자동 반영)</Label>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs text-blue-800 whitespace-pre-line leading-relaxed">
              {pensionNote.replace("[연금계산기 분석 결과]\n", "")}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">예상 반론</Label>
            <button
              type="button"
              onClick={() => toggleVoice("objection")}
              disabled={isLoading || isCorrectingVoice}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all disabled:opacity-50 ${
                voiceTarget === "objection" ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isCorrectingVoice && voiceTarget === "objection"
                ? <><Loader2 className="h-3 w-3 animate-spin" />보정 중</>
                : voiceTarget === "objection"
                ? <><MicOff className="h-3 w-3" />녹음 중지</>
                : <><Mic className="h-3 w-3" />음성 입력</>}
            </button>
          </div>
          <Textarea
            placeholder="예: 보험료가 비싸다, 이미 보험이 많다, 나중에 생각해보겠다"
            value={expectedObjections}
            onChange={e => setExpectedObjections(e.target.value)}
            disabled={isLoading}
            className="min-h-[60px] resize-none text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">추가 메모</Label>
            <button
              type="button"
              onClick={() => toggleVoice("notes")}
              disabled={isLoading || isCorrectingVoice}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all disabled:opacity-50 ${
                voiceTarget === "notes" ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isCorrectingVoice && voiceTarget === "notes"
                ? <><Loader2 className="h-3 w-3 animate-spin" />보정 중</>
                : voiceTarget === "notes"
                ? <><MicOff className="h-3 w-3" />녹음 중지</>
                : <><Mic className="h-3 w-3" />음성 입력</>}
            </button>
          </div>
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
            {state.cached ? "캐시에서 불러옴" : `${state.provider}${state.model ? ` (${state.model})` : ''} 모델로 생성됨`}
          </p>
        )}

        {hasResult && (
          <SafetyCheckDisplay
            text={Object.values(sections).join('\n')}
            outputId={savedId}
            featureType="ai_script"
          />
        )}

        {hasResult && (
          <OutputRater
            featureType="ai_script"
            outputId={savedId}
            promptVersion={(state as any).promptVersion ?? null}
          />
        )}
      </div>
    </div>
  )
}
