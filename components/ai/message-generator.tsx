"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  Sparkles, Copy, Download, RefreshCw, CheckCircle, AlertCircle,
  Zap, Bookmark, BookmarkCheck, MessageSquare, MessageCircle,
  Heart, TrendingUp, Send, ChevronDown, ChevronUp, Mic, MicOff, Loader2, Brain,
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
import { OutputRater } from "@/components/ai/output-rater"
import { SafetyCheckDisplay } from "@/components/ai/safety-check-display"

// ─── Constants ────────────────────────────────────────────────────────────────

const AGE_GROUPS = ["20대", "30대", "40대", "50대", "60대 이상"]
const OCCUPATIONS = ["직장인", "자영업자", "공무원", "주부", "학생", "은퇴자", "기타"]
const RELATIONSHIPS = ["신규 고객", "기존 고객", "지인/소개", "온라인 문의", "기타"]
const PURPOSES = ["보험 만기 안내", "신상품 소개", "계약 갱신 권유", "생일/기념일 축하", "감사 인사", "안부 인사", "상담 예약 요청", "기타"]
const PRODUCT_FIELDS = ["생명보험", "건강보험", "실손보험", "자동차보험", "연금보험", "저축보험", "어린이보험", "종신보험", "기타"]

// 리크루팅 후보 대상 메시지 — 고객 불러오기에서 "리크루팅 후보"를 선택하면 자동 전환
const RECRUIT_PURPOSES = ["보험설계사 커리어 제안", "설명회/상담 초대", "이직/커리어 전환 제안", "복직 제안 (경단녀 등)", "부업/투잡 제안", "안부 인사 후 제안", "기타"]
const RECRUIT_APPEAL_POINTS = ["수입 구조", "시간 자유도", "자기계발/성장", "여성 친화적 근무환경", "정년 없음", "본사 지원 시스템", "기타"]
const TONES = [
  { value: "격식체", desc: "공식적·정중한 문체" },
  { value: "친근체", desc: "따뜻하고 편안한 문체" },
  { value: "카톡 스타일", desc: "짧고 경쾌, 이모지 포함" },
]

const OUTPUT_TABS = [
  { key: "SMS",        icon: MessageSquare,  label: "문자용",         color: "blue" },
  { key: "KAKAO",     icon: MessageCircle,  label: "카톡용",         color: "yellow" },
  { key: "SOFT",      icon: Heart,          label: "부드러운 버전",  color: "pink" },
  { key: "PERSUASIVE",icon: TrendingUp,     label: "설득력 있는 버전", color: "purple" },
  { key: "FOLLOWUP",  icon: Send,           label: "후속 연락용",    color: "green" },
] as const

type TabKey = typeof OUTPUT_TABS[number]["key"]

interface InitialData {
  customerId?: string
  customerName?: string
  ageGroup?: string
  occupation?: string
  relationship?: string
  productField?: string
  extraNotes?: string
  contactType?: "customer" | "recruit"
  mbtiType?: string
}

interface Props {
  initialUsage: number
  limit: number
  planName: string
  initialData?: InitialData
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessageGenerator({ initialUsage, limit, planName, initialData }: Props) {
  // 고객을 불러온 경우 그 구분(customer/recruit)을 기본값으로 쓰되, 고객 불러오기 없이도
  // 수동으로 전환할 수 있도록 상태로 관리 — 리크루팅 후보를 미리 등록해두지 않은 경우에도
  // 이 화면에서 바로 리크루팅 제안 문자를 만들 수 있어야 함.
  const [isRecruit, setIsRecruit] = useState(initialData?.contactType === "recruit")
  const purposeOptions = isRecruit ? RECRUIT_PURPOSES : PURPOSES
  const appealOptions = isRecruit ? RECRUIT_APPEAL_POINTS : PRODUCT_FIELDS
  const appealLabel = isRecruit ? "제안 포인트" : "상품 분야"

  // Form state
  const [customerName, setCustomerName] = useState(initialData?.customerName ?? "")
  const [ageGroup, setAgeGroup] = useState(initialData?.ageGroup ?? "")
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "")
  const [relationship, setRelationship] = useState(initialData?.relationship ?? "")
  const [purpose, setPurpose] = useState("")
  const [productField, setProductField] = useState(initialData?.productField ?? "")
  const [categoryId, setCategoryId] = useState("")
  const [mbtiType, setMbtiType] = useState(initialData?.mbtiType ?? "")

  function toggleRecruitMode(next: boolean) {
    setIsRecruit(next)
    setPurpose("")
    setProductField("")
  }
  const [tone, setTone] = useState("친근체")
  const [length, setLength] = useState("보통 (100자 이내)")
  const [extraNotes, setExtraNotes] = useState(initialData?.extraNotes ?? "")
  const [showAdvanced, setShowAdvanced] = useState(!!(initialData?.occupation || initialData?.relationship))

  // 고객관리에 등록된 고객 목록 불러오기 — URL로 customerId 없이 이 화면에 직접 들어온 경우에도
  // 등록된 고객을 바로 선택해서 정보를 채울 수 있도록 함 (customer-analysis.tsx와 동일 패턴)
  const [customers, setCustomers] = useState<Array<{
    id: string; name: string; phone: string | null; age_group: string | null; job: string | null
    relationship_type: string | null; interest_products: string[]; contact_type: "customer" | "recruit"
    mbti_type: string | null
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
    setPurpose("")
    setCustomerName(c.name ?? "")
    if (c.age_group) setAgeGroup(c.age_group)
    if (c.job) setOccupation(c.job)
    if (c.relationship_type) setRelationship(c.relationship_type)
    setProductField(recruit ? "" : (Array.isArray(c.interest_products) ? (c.interest_products[0] ?? "") : ""))
    setMbtiType(c.mbti_type ?? "")
  }

  // 고객성향분석 결과 불러오기 (선택 — 불러오면 MBTI/성향에 맞춰 문체가 조정됨)
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

  // 저장된 성향분석 결과에는 원래 분석 세션의 상품/관심사 맥락([기존 보험], [추천 상품] 등)이
  // 함께 들어있어, 이걸 통째로 넘기면 지금 생성창에서 고른 상품 분야를 밀어내고 엉뚱한 상품
  // 얘기가 섞여 나온다. 문체·어조에만 쓰이는 성향 관련 섹션만 골라서 넘긴다.
  function extractPersonalityOnly(raw: string): string {
    const tagOrder = ['고객 정보', '주요 관심사', '기존 보험', '메모', '성향 분석', '예측 니즈', '추천 상품', '추천 첫마디', '주의사항']
    const KEEP = new Set(['성향 분석', '추천 첫마디', '주의사항'])

    const extract = (tag: string) => {
      const idx = tagOrder.indexOf(tag)
      const start = raw.indexOf(`[${tag}]`)
      if (start === -1) return ''
      const contentStart = start + tag.length + 2
      let end = raw.length
      for (let i = idx + 1; i < tagOrder.length; i++) {
        const nextStart = raw.indexOf(`[${tagOrder[i]}]`)
        if (nextStart !== -1) { end = nextStart; break }
      }
      return raw.slice(contentStart, end).trim()
    }

    const parts = tagOrder
      .filter(t => KEEP.has(t))
      .map(t => {
        const v = extract(t)
        return v ? `[${t}]\n${v}` : ''
      })
      .filter(Boolean)

    // 형식이 다른 과거 데이터 등 태그를 하나도 못 찾으면 원본을 그대로 사용
    return parts.length > 0 ? parts.join('\n\n') : raw
  }

  function applyAnalysis(r: { id: string; title: string; output_text: string; input_data?: Record<string, string> }) {
    setSelectedAnalysis(r.id)
    setSelectedAnalysisText(extractPersonalityOnly(r.output_text))
    setAnalysisOpen(false)

    if (r.input_data?.customerName && !customerName) setCustomerName(r.input_data.customerName)
    if (r.input_data?.ageGroup && !ageGroup) setAgeGroup(r.input_data.ageGroup.replace(/\s*(초반|후반)$/, ''))
    if (r.input_data?.occupation && !occupation) setOccupation(r.input_data.occupation)

    toast.success(`"${r.title}" 성향이 문체에 반영됩니다`)
  }

  // Result state
  const [activeTab, setActiveTab] = useState<TabKey>("SMS")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [isCorrectingVoice, setIsCorrectingVoice] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef<string>("")

  async function correctVoiceInput(rawText: string) {
    if (!rawText.trim()) return
    setIsCorrectingVoice(true)
    try {
      const res = await fetch("/api/ai/voice-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, context: { purpose, productField, tone } }),
      })
      if (!res.ok) throw new Error("보정 실패")
      const data = await res.json()
      setExtraNotes(prev => prev ? prev + " " + data.corrected : data.corrected)
    } catch {
      setExtraNotes(prev => prev ? prev + " " + rawText : rawText)
    } finally {
      setIsCorrectingVoice(false)
    }
  }

  function stopRecording() {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    setIsRecording(false)
    // iOS: onend may fire before onresult, so process transcript on stop too
    if (transcriptRef.current) {
      correctVoiceInput(transcriptRef.current)
      transcriptRef.current = ""
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording()
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error("이 브라우저는 음성 입력을 지원하지 않습니다. Chrome 또는 Safari를 사용해주세요.")
      return
    }

    transcriptRef.current = ""

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognition()
    recognition.lang = "ko-KR"
    recognition.continuous = true   // iOS: continuous keeps session alive longer
    recognition.interimResults = true

    recognition.onresult = (e: any) => {
      // Collect all final results
      let finalText = ""
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript
        }
      }
      if (finalText) transcriptRef.current = finalText
    }

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        toast.error("음성이 감지되지 않았습니다. 다시 시도해주세요.")
      } else if (e.error !== "aborted") {
        toast.error("음성 인식 오류가 발생했습니다. 다시 시도해주세요.")
      }
      recognitionRef.current = null
      setIsRecording(false)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsRecording(false)
      if (transcriptRef.current) {
        correctVoiceInput(transcriptRef.current)
        transcriptRef.current = ""
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsRecording(true)
      toast.info("🎤 녹음 중... 말씀 후 [녹음 중지] 버튼을 눌러주세요")
    } catch {
      toast.error("음성 입력을 시작할 수 없습니다. 마이크 권한을 확인해주세요.")
      recognitionRef.current = null
    }
  }

  const { state, generate } = useAIGenerate(
    Math.max(0, limit - initialUsage),
    { endpoint: "/api/ai/message", minIntervalMs: 1000, maxRetries: 1 }
  )

  const isLoading = state.status === "loading"
  const isLimitReached = state.remaining === 0
  const sections: Record<string, string> = (state.result as unknown as { sections?: Record<string, string> })?.sections ?? {}
  const hasResult = state.status === "success" && Object.keys(sections).length > 0

  useEffect(() => {
    if (state.status === "success" && hasResult) {
      if (state.cached) toast.info("이전에 생성된 결과를 불러왔습니다")
      else toast.success("메시지 5가지 버전이 생성되었습니다!")
      setSavedId(null)
      setIsFavorite(false)
    }
    if (state.status === "error" && state.error) {
      toast.error(state.error)
    }
  }, [state.status, state.cached, state.error, hasResult])

  function buildParams(forceRegenerate = false) {
    return {
      customerName, ageGroup, occupation, relationship, purpose, productField, categoryId, tone, length,
      contactType: isRecruit ? "recruit" : "customer",
      mbtiType,
      extraNotes: [
        selectedAnalysisText ? `[고객성향분석 결과]\n${selectedAnalysisText}` : '',
        extraNotes,
      ].filter(Boolean).join("\n\n"),
      forceRegenerate,
    }
  }

  function handleGenerate() {
    if (!purpose) { toast.error("목적을 선택해주세요"); return }
    if (!productField) { toast.error(`${appealLabel}를 선택해주세요`); return }
    if (isLimitReached) { toast.error("이번 달 사용 한도를 초과했습니다"); return }
    clientTrackFeatureStart("ai_message", { purpose, productField })
    generate(buildParams(false))
  }

  function handleRegenerate() {
    if (!purpose || !productField) return
    clientTrackFeatureStart("ai_message", { purpose, productField, regenerate: true })
    generate(buildParams(true))
  }

  async function handleCopy(key: string) {
    const raw = sections[key] ?? ""
    if (!raw) return
    const text = raw
      .replace(/\n*\[보험 관련 유의사항\][\s\S]*/i, "")  // 유의사항 제거
      .replace(/^#{1,6}\s*/gm, "")   // ## 제목 마크다운 제거
      .replace(/^---+\s*$/gm, "")    // --- 구분선 제거
      .replace(/\*\*(.*?)\*\*/g, "$1") // **굵게** 제거
      .replace(/\*(.*?)\*/g, "$1")     // *기울임* 제거
      .replace(/\n{3,}/g, "\n\n")      // 3줄 이상 빈줄 → 2줄로
      .trimEnd()
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("클립보드에 복사되었습니다")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function handleDownload() {
    const allText = OUTPUT_TABS
      .map(t => `【${t.label}】\n${sections[t.key] ?? "(생성되지 않음)"}\n`)
      .join("\n" + "─".repeat(40) + "\n\n")
    const blob = new Blob([allText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `메시지_${productField}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("TXT 파일이 다운로드되었습니다")
    clientTrackDownload("result", { feature: "ai_message", productField })
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
          type: "sms",
          title: `${productField} - ${purpose} (${customerName || "고객"})`,
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
  }, [hasResult, isSaving, sections, productField, purpose, customerName, state.provider])

  async function handleFavoriteToggle() {
    if (!savedId) {
      await handleSave()
      return
    }
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── 입력 폼 ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* 사용량 */}
        <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
          isLimitReached ? "bg-red-50 border-red-200 text-red-700" :
          state.remaining <= 3 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
          "bg-blue-50 border-blue-100 text-blue-700"
        }`}>
          <span>이번 달 사용량 <strong>{usedCount}/{limit}회</strong> <span className="opacity-70">({planName} 플랜)</span></span>
          {isLimitReached && <Badge variant="destructive" className="text-xs">한도 초과</Badge>}
          {!isLimitReached && state.remaining <= 3 && <Badge className="text-xs bg-yellow-500 text-white">{state.remaining}회 남음</Badge>}
        </div>

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
          <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>
              고객 정보 &ldquo;{customerName}&rdquo;가 자동으로 입력되었습니다
              {mbtiType && ` · MBTI(${mbtiType})에 맞춰 문체가 자동 조정됩니다`}
            </span>
          </div>
        )}

        {/* 문자 종류 — 고객을 안 불러온 경우에도 여기서 바로 리크루팅 제안 문자로 전환 가능 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">문자 종류</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleRecruitMode(false)}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 ${
                !isRecruit ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              일반 고객 문자
            </button>
            <button
              type="button"
              onClick={() => toggleRecruitMode(true)}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 ${
                isRecruit ? "bg-purple-700 text-white border-purple-700" : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
              }`}
            >
              리크루팅 제안 문자
            </button>
          </div>
        </div>

        {/* 고객성향분석 결과 불러오기 — 불러오면 MBTI/성향에 맞춰 문체가 조정됨 (선택) */}
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

        {isRecruit && (
          <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>리크루팅 후보용 제안 메시지로 작성됩니다</span>
          </div>
        )}

        {/* 필수 항목 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">목적 <span className="text-red-500">*</span></Label>
            <select
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">선택해주세요</option>
              {purposeOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{appealLabel} <span className="text-red-500">*</span></Label>
            <select
              value={productField}
              onChange={e => setProductField(e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">선택해주세요</option>
              {appealOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {!isRecruit && <CategorySelect value={categoryId} onChange={setCategoryId} disabled={isLoading} />}

        {/* 고객 이름 + 연령대 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">고객 이름 <span className="text-gray-400 font-normal">(선택)</span></Label>
            <Input placeholder="예: 홍길동" value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isLoading} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">연령대 <span className="text-gray-400 font-normal">(선택)</span></Label>
            <select
              value={ageGroup}
              onChange={e => setAgeGroup(e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">선택</option>
              {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* 말투 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">말투</Label>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                disabled={isLoading}
                className={`px-2 py-2 rounded-lg text-xs border transition-all text-center disabled:opacity-50 ${
                  tone === t.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="font-medium">{t.value}</div>
                <div className={`text-[10px] mt-0.5 ${tone === t.value ? "text-blue-100" : "text-gray-400"}`}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 특별 추가 내용 (후킹 포인트) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              특별 추가 내용 <span className="text-orange-500 font-normal">(입력 시 후킹 문구에 활용돼요)</span>
            </Label>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading || isCorrectingVoice}
              title={isRecording ? "녹음 중지" : "음성으로 입력"}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50 ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isCorrectingVoice
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />보정 중</>
                : isRecording
                ? <><MicOff className="h-3.5 w-3.5" />녹음 중지</>
                : <><Mic className="h-3.5 w-3.5" />음성 입력</>}
            </button>
          </div>
          <Textarea
            placeholder="예: 3대 질병(암·뇌·심장) 진단 시 즉시 3,000만원 일시금 지급, 100세까지 갱신 없이 보장 유지"
            value={extraNotes}
            onChange={e => setExtraNotes(e.target.value)}
            className="min-h-[70px] resize-none text-sm"
            disabled={isLoading}
          />
          <p className="text-[11px] text-gray-400">
            특정 상품의 차별화된 보장 내용을 입력하면, 고객의 호기심을 자극하는 후킹 문구가 메시지에 반영됩니다. 마이크 버튼으로 음성 입력도 가능합니다.
          </p>
        </div>

        {/* 고급 설정 토글 */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          고급 설정 {showAdvanced ? "닫기" : "열기"} (직업, 관계)
        </button>

        {showAdvanced && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">직업</Label>
                <select
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">선택</option>
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">고객과의 관계</Label>
                <select
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">선택</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isLoading || isLimitReached}
          className="w-full h-11 text-sm bg-[#1e3a5f] hover:bg-[#162d4a]"
        >
          {isLoading ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />AI가 5가지 버전 생성 중...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" />메시지 5가지 버전 생성하기</>
          )}
        </Button>

        {state.status === "error" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}
      </div>

      {/* ── 결과 ────────────────────────────────────────── */}
      <div className="space-y-3">
        <Card className="min-h-[520px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="text-base font-semibold">생성된 메시지</span>
              {hasResult && (
                <div className="flex gap-1.5">
                  {state.cached && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Zap className="h-3 w-3" /> 캐시
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleFavoriteToggle} className="h-7 px-2 text-xs">
                    {isFavorite
                      ? <><BookmarkCheck className="h-3.5 w-3.5 text-orange-500 mr-1" />즐겨찾기</>
                      : <><Bookmark className="h-3.5 w-3.5 mr-1" />즐겨찾기</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || !!savedId} className="h-7 px-2 text-xs">
                    {savedId ? <><CheckCircle className="h-3.5 w-3.5 text-green-500 mr-1" />저장됨</> : "저장"}
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
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                <p className="text-sm text-gray-500">AI가 5가지 버전을 작성하고 있습니다...</p>
                <p className="text-xs text-gray-400">문자용·카톡용·부드러운·설득력·후속 연락</p>
              </div>
            ) : hasResult ? (
              <div className="space-y-3">
                {/* Tab buttons */}
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
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(tab.key)}
                          className="h-7 px-2 text-xs text-gray-500"
                        >
                          {copiedKey === tab.key
                            ? <><CheckCircle className="h-3.5 w-3.5 text-green-500 mr-1" />복사됨</>
                            : <><Copy className="h-3.5 w-3.5 mr-1" />복사</>}
                        </Button>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[280px] border">
                        {sections[tab.key] ?? ""}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 space-y-3">
                <Sparkles className="h-10 w-10 text-gray-200" />
                <p className="text-sm">목적과 상품 분야를 선택하고</p>
                <p className="text-sm">&ldquo;메시지 5가지 버전 생성하기&rdquo;를 클릭하세요</p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
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

        {hasResult && (
          <SafetyCheckDisplay
            text={Object.values(sections).join('\n')}
            outputId={savedId}
            featureType="ai_message"
          />
        )}

        {hasResult && (
          <OutputRater
            featureType="ai_message"
            outputId={savedId}
            promptVersion={(state as any).promptVersion ?? null}
          />
        )}
      </div>
    </div>
  )
}
