"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Sparkles, Copy, Download, RefreshCw, CheckCircle, AlertCircle,
  Zap, Bookmark, BookmarkCheck, FileText, Loader2,
  BookOpen, Eye, ShieldCheck, HelpCircle,
  MessageSquare, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAIGenerate } from "@/hooks/useAIGenerate"
import { OutputRater } from "@/components/ai/output-rater"
import { SafetyCheckDisplay } from "@/components/ai/safety-check-display"
import { clientTrackFeatureStart, clientTrackDownload } from "@/lib/analytics/client-track"
import { CategorySelect } from "@/components/ai/category-select"

// ─── Constants ─────────────────────────────────────────────────────────────

const AGE_GROUPS = ["20대", "30대", "40대", "50대", "60대 이상"]
const OCCUPATIONS = ["직장인", "자영업자", "공무원", "전문직", "주부", "은퇴자", "기타"]
const PURPOSES = [
  "신규 가입 설득", "계약 갱신 안내", "보장 분석 설명",
  "타사 비교", "민원 예방", "고객 이해도 향상",
]
const DIFFICULTY_LEVELS = [
  { value: "쉽게 (보험 초보자)", label: "쉽게", desc: "비유·예시 중심" },
  { value: "중간 (일반인)", label: "중간", desc: "표준 설명" },
  { value: "자세히 (보험 이해자)", label: "자세히", desc: "용어 포함" },
]
const FORMAT_STYLES = ["친근하고 쉽게", "전문적이고 논리적으로", "핵심만 간결하게", "스토리텔링 방식"]

const OUTPUT_TABS = [
  { key: "SUMMARY",        icon: BookOpen,       label: "쉬운 요약",        color: "blue" },
  { key: "COVERAGE",       icon: ShieldCheck,    label: "핵심 보장",        color: "green" },
  { key: "MISCONCEPTIONS", icon: Eye,            label: "오해하기 쉬운 부분", color: "amber" },
  { key: "QNA",            icon: HelpCircle,     label: "예상 Q&A",         color: "teal" },
  { key: "AGENT_SCRIPT",   icon: MessageSquare,  label: "상담사 멘트",       color: "indigo" },
  { key: "CAUTION",        icon: AlertCircle,    label: "주의 문구",         color: "orange" },
] as const

type TabKey = typeof OUTPUT_TABS[number]["key"]

interface UploadedFileSummary {
  id: string
  original_file_name: string
  file_size_mb: number
  status: string
  created_at: string
}

interface Props {
  initialAnalysisCount: number
  analysisLimit: number
  planName: string
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DocumentGenerator({ initialAnalysisCount, analysisLimit, planName }: Props) {
  // File list
  const [availableFiles, setAvailableFiles] = useState<UploadedFileSummary[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)

  // Form state
  const [selectedFileId, setSelectedFileId] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [occupation, setOccupation] = useState("")
  const [customerSituation, setCustomerSituation] = useState("")
  const [explanationPurpose, setExplanationPurpose] = useState("")
  const [difficultyLevel, setDifficultyLevel] = useState("중간 (일반인)")
  const [formatStyle, setFormatStyle] = useState("친근하고 쉽게")
  const [extraRequests, setExtraRequests] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Result state
  const [activeTab, setActiveTab] = useState<TabKey>("SUMMARY")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [generatedFileName, setGeneratedFileName] = useState("")

  const { state, generate } = useAIGenerate(
    Math.max(0, analysisLimit - initialAnalysisCount),
    { endpoint: "/api/ai/document", minIntervalMs: 1000, maxRetries: 1 }
  )

  const isLoading = state.status === "loading"
  const isLimitReached = state.remaining === 0
  const sections: Record<string, string> = (state.result as unknown as { sections?: Record<string, string> })?.sections ?? {}
  const hasResult = state.status === "success" && Object.keys(sections).length > 0

  // Load completed PDF files
  useEffect(() => {
    async function load() {
      setIsLoadingFiles(true)
      try {
        const res = await fetch("/api/files")
        const data = await res.json()
        const completed = (data.files ?? []).filter((f: UploadedFileSummary) => f.status === "completed")
        setAvailableFiles(completed)
        if (completed.length === 1) setSelectedFileId(completed[0].id)
      } catch { /* non-critical */ }
      finally { setIsLoadingFiles(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (state.status === "success" && hasResult) {
      const fn = (state.result as unknown as { fileName?: string })?.fileName ?? ""
      if (fn) setGeneratedFileName(fn)
      if (state.cached) toast.info("이전에 생성된 결과를 불러왔습니다")
      else toast.success("설명자료 8개 섹션이 생성되었습니다!")
      setSavedId(null)
      setIsFavorite(false)
    }
    if (state.status === "error" && state.error) toast.error(state.error)
  }, [state.status, state.cached, state.error, state.result, hasResult])

  function buildParams(forceRegenerate = false) {
    return {
      fileId: selectedFileId,
      ageGroup, occupation, customerSituation, explanationPurpose,
      difficultyLevel, formatStyle, extraRequests, categoryId, forceRegenerate,
    }
  }

  function handleGenerate() {
    if (!selectedFileId) { toast.error("파일을 선택해주세요"); return }
    if (!explanationPurpose) { toast.error("설명 목적을 선택해주세요"); return }
    if (isLimitReached) { toast.error("이번 달 AI 분석 한도를 초과했습니다"); return }
    clientTrackFeatureStart("ai_document", { explanationPurpose, difficultyLevel })
    generate(buildParams(false))
  }

  function handleRegenerate() {
    if (!selectedFileId || !explanationPurpose) return
    clientTrackFeatureStart("ai_document", { explanationPurpose, regenerate: true })
    generate(buildParams(true))
  }

  async function handleCopy(key: string) {
    const text = sections[key] ?? ""
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("복사되었습니다")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  async function handleCopyAll() {
    const all = OUTPUT_TABS
      .map(t => `【${t.label}】\n${sections[t.key] ?? "(생성되지 않음)"}`)
      .join("\n\n" + "─".repeat(40) + "\n\n")
    await navigator.clipboard.writeText(all)
    toast.success("전체 내용이 복사되었습니다")
  }

  function handleDownload() {
    const allText = OUTPUT_TABS
      .map(t => `【${t.label}】\n${sections[t.key] ?? "(생성되지 않음)"}`)
      .join("\n\n" + "═".repeat(50) + "\n\n")
    const header = [
      "AI 고객 설명자료",
      `생성일: ${new Date().toLocaleDateString("ko-KR")}`,
      `원본 파일: ${generatedFileName}`,
      `설명 목적: ${explanationPurpose} | 난이도: ${difficultyLevel}`,
      "═".repeat(50),
      "",
    ].join("\n")
    const blob = new Blob([header + allText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `설명자료_${generatedFileName.replace(/\.pdf$/i, "")}_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("TXT 파일이 다운로드되었습니다")
    clientTrackDownload("result", { feature: "ai_document", explanationPurpose })
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
          type: "pdf_explanation",
          title: `${generatedFileName || "설명자료"} - ${explanationPurpose}`,
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
      toast.success("보관함에 저장되었습니다")
    } catch {
      toast.error("저장에 실패했습니다")
    } finally {
      setIsSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, isSaving, sections, generatedFileName, explanationPurpose, state.provider])

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

  const usedCount = analysisLimit - state.remaining

  // ─── Chip selector helper ────────────────────────────────────────────────
  function ChipSelect({
    label, required, value, onChange, options, columns = 3,
  }: {
    label: string; required?: boolean; value: string
    onChange: (v: string) => void; options: string[]; columns?: number
  }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {options.map(opt => (
            <button
              key={opt} type="button"
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

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
      {/* ── 입력 폼 ────────────────────────────────────── */}
      <div className="space-y-4 xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto xl:pr-1">
        {/* 사용량 */}
        <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
          isLimitReached ? "bg-red-50 border-red-200 text-red-700" :
          state.remaining <= 2 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
          "bg-orange-50 border-orange-100 text-orange-700"
        }`}>
          <span>이번 달 AI 분석 <strong>{usedCount}/{analysisLimit}회</strong> <span className="opacity-70">({planName} 플랜)</span></span>
          {isLimitReached && <Badge variant="destructive" className="text-xs">한도 초과</Badge>}
          {!isLimitReached && state.remaining <= 2 && <Badge className="text-xs bg-yellow-500 text-white">{state.remaining}회 남음</Badge>}
        </div>

        {/* 파일 선택 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">분석할 PDF 선택 <span className="text-red-500">*</span></Label>
          {isLoadingFiles ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-3 border rounded-lg">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />파일 목록 불러오는 중...
            </div>
          ) : availableFiles.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>텍스트 추출이 완료된 PDF가 없습니다. 먼저 PDF를 업로드해주세요.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {availableFiles.map(file => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all disabled:opacity-50 ${
                    selectedFileId === file.id
                      ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <FileText className={`h-4 w-4 shrink-0 ${selectedFileId === file.id ? "text-white" : "text-orange-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{file.original_file_name}</p>
                    <p className={`text-[10px] ${selectedFileId === file.id ? "text-blue-200" : "text-gray-400"}`}>
                      {(file.file_size_mb < 1 ? `${(file.file_size_mb * 1024).toFixed(0)}KB` : `${file.file_size_mb.toFixed(1)}MB`)}
                      {" · "}{new Date(file.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {selectedFileId === file.id && <CheckCircle className="h-3.5 w-3.5 text-white shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 설명 목적 */}
        <ChipSelect label="설명 목적" required value={explanationPurpose} onChange={setExplanationPurpose} options={PURPOSES} columns={2} />

        <CategorySelect value={categoryId} onChange={setCategoryId} disabled={isLoading} />

        {/* 난이도 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">설명 난이도</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {DIFFICULTY_LEVELS.map(d => (
              <button
                key={d.value} type="button"
                onClick={() => setDifficultyLevel(d.value)}
                disabled={isLoading}
                className={`px-2 py-2 rounded-lg text-xs border transition-all text-center disabled:opacity-50 ${
                  difficultyLevel === d.value
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="font-medium">{d.label}</div>
                <div className={`text-[10px] mt-0.5 ${difficultyLevel === d.value ? "text-blue-200" : "text-gray-400"}`}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 형식 */}
        <ChipSelect label="설명 형식" value={formatStyle} onChange={setFormatStyle} options={FORMAT_STYLES} columns={2} />

        {/* 고급 설정 토글 */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          고급 설정 {showAdvanced ? "닫기" : "열기"} (연령대, 직업, 상황, 추가 요청)
        </button>

        {showAdvanced && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <ChipSelect label="고객 연령대" value={ageGroup} onChange={setAgeGroup} options={AGE_GROUPS} columns={5} />
            <ChipSelect label="고객 직업" value={occupation} onChange={setOccupation} options={OCCUPATIONS} columns={4} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">고객 상황</Label>
              <Textarea
                placeholder="예: 최근 부모님이 암 진단을 받으셨고, 본인도 건강 걱정이 많음"
                value={customerSituation}
                onChange={e => setCustomerSituation(e.target.value)}
                disabled={isLoading}
                className="min-h-[60px] resize-none text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">추가 요청사항</Label>
              <Textarea
                placeholder="예: 자녀 관련 보장 내용을 특히 강조해주세요"
                value={extraRequests}
                onChange={e => setExtraRequests(e.target.value)}
                disabled={isLoading}
                className="min-h-[60px] resize-none text-xs"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isLoading || isLimitReached || availableFiles.length === 0}
          className="w-full h-11 text-sm bg-[#1e3a5f] hover:bg-[#162d4a]"
        >
          {isLoading ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />AI가 설명자료 생성 중...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" />설명자료 생성하기</>
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
              <div>
                <span className="text-base font-semibold">생성된 설명자료</span>
                {generatedFileName && hasResult && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">({generatedFileName})</span>
                )}
              </div>
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
                <div className="w-12 h-12 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
                <p className="text-sm text-gray-500">PDF 내용을 분석하고 설명자료를 작성 중입니다...</p>
                <p className="text-xs text-gray-400">최대 30초 소요될 수 있습니다</p>
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
                {OUTPUT_TABS.map(tab =>
                  activeTab === tab.key ? (
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
                  ) : null
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[480px] text-gray-400 space-y-3">
                <FileText className="h-12 w-12 text-gray-200" />
                <p className="text-sm">PDF 파일을 선택하고 설명 목적을 고른 후</p>
                <p className="text-sm">&ldquo;설명자료 생성하기&rdquo;를 클릭하세요</p>
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

        {hasResult && (
          <SafetyCheckDisplay
            text={Object.values(sections).join('\n')}
            outputId={savedId}
            featureType="ai_document"
          />
        )}

        {hasResult && (
          <OutputRater
            featureType="ai_document"
            outputId={savedId}
            promptVersion={(state as any).promptVersion ?? null}
          />
        )}
      </div>
    </div>
  )
}
