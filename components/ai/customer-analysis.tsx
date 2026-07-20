"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Brain, Copy, RefreshCw, Star, AlertTriangle, MessageSquare, Tag, TrendingUp, Mic, MicOff, Loader2, Save, BookmarkCheck, QrCode, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import QRCode from "react-qr-code"
import type { MonthlyUsageData } from "@/lib/subscription/usage"
import type { PlanLimits, PlanId } from "@/lib/subscription/plans"
import { UsageWarningBanner } from "@/components/billing/usage-limit-banner"
import { MBTI_TYPES } from "@/types"

const MBTI_URL = "https://m.site.naver.com/2bjIA"

const AGE_GROUPS = ["20대", "30대 초반", "30대 후반", "40대 초반", "40대 후반", "50대", "60대 이상"]
const INCOME_LEVELS = ["월 200만원 미만", "월 200~300만원", "월 300~500만원", "월 500만원 이상"]
const FAMILY_STATUS = ["미혼", "기혼 (자녀 없음)", "기혼 (자녀 있음)", "이혼/사별"]
const PERSONALITY_TYPES = ["꼼꼼하고 분석적", "빠른 결정 선호", "관계 중심적", "보수적/안전 추구", "트렌드에 민감", "가격 민감형"]
const CONCERNS = ["노후 준비", "질병/암 대비", "가족 보장", "저축/재테크", "사고/상해 대비", "세금 절약"]

interface CustomerRecord {
  id: string
  name: string
  phone: string | null
  age_group: string | null
  gender: string | null
  job: string | null
  family_status: string | null
  children_status: string | null
  mbti_type: string | null
}

interface AnalysisResult {
  personality: string
  needs: string[]
  products: Array<{ name: string; reason: string }>
  firstLine: string
  cautions: string
  keywords: string[]
}

interface CustomerAnalysisProps {
  planName: string
  planId?: PlanId
  limits: PlanLimits
  usage: MonthlyUsageData
}

export function CustomerAnalysis({ planName, planId, limits, usage }: CustomerAnalysisProps) {
  const [customerName, setCustomerName] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [gender, setGender] = useState("")
  const [occupation, setOccupation] = useState("")
  const [income, setIncome] = useState("")
  const [familyStatus, setFamilyStatus] = useState("")
  const [hasChildren, setHasChildren] = useState("")
  const [existingInsurance, setExistingInsurance] = useState("")
  const [mainConcern, setMainConcern] = useState("")
  const [personality, setPersonality] = useState("")
  const [extraNotes, setExtraNotes] = useState("")
  const [mbtiType, setMbtiType] = useState("")
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [activeTab, setActiveTab] = useState<"form" | "qr">("form")
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [remaining, setRemaining] = useState(limits.scriptLimit - usage.scriptCount)
  const [isSaving, setIsSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isCorrectingVoice, setIsCorrectingVoice] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef("")
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch("/api/customers")
      .then(res => res.json())
      .then(data => setCustomers(data.customers ?? []))
      .catch(() => {})
  }, [])

  // 고객관리에 등록된 고객 정보를 불러와 채운다. 고객관리와 성향분석은 항목 값 체계가 달라서
  // (예: 연령대 "30대" vs "30대 초반/후반", 소득 구간 경계가 다름) 안전하게 대응되는 항목만
  // 채우고, 값 체계가 어긋나는 소득 수준은 채우지 않고 사용자가 직접 고르도록 둔다.
  function handleSelectCustomer(id: string) {
    setSelectedCustomerId(id)
    if (!id) return
    const c = customers.find(x => x.id === id)
    if (!c) return

    setCustomerName(c.name ?? "")
    if (c.gender === "남성" || c.gender === "여성") setGender(c.gender)
    if (c.job) setOccupation(c.job)
    // MBTI는 두 화면이 같은 16유형 체계를 쓰므로 값 변환 없이 그대로 채운다 —
    // 고객관리에 미리 저장해두면 매번 다시 입력할 필요가 없다.
    if (c.mbti_type) setMbtiType(c.mbti_type)

    if (c.age_group) {
      const mappedAge =
        c.age_group === "30대" ? "30대 초반" :
        c.age_group === "40대" ? "40대 초반" :
        c.age_group
      if (AGE_GROUPS.includes(mappedAge)) setAgeGroup(mappedAge)
    }

    if (c.family_status === "미혼") {
      setFamilyStatus("미혼")
    } else if (c.family_status === "기혼") {
      setFamilyStatus(c.children_status && c.children_status !== "없음" ? "기혼 (자녀 있음)" : "기혼 (자녀 없음)")
    } else if (c.family_status === "이혼/별거" || c.family_status === "사별") {
      setFamilyStatus("이혼/사별")
    }

    toast.success(`${c.name} 고객 정보를 불러왔습니다`)
  }

  const LOADING_STEPS = [
    "고객 정보 분석 중...",
    "MBTI 성향 파악 중...",
    "보험 상담 전략 수립 중...",
    "맞춤 분석 리포트 작성 중...",
  ]

  function startLoadingSteps() {
    setLoadingStep(0)
    let step = 0
    loadingTimerRef.current = setInterval(() => {
      step += 1
      if (step < 4) setLoadingStep(step)
      else if (loadingTimerRef.current) clearInterval(loadingTimerRef.current)
    }, 3000)
  }

  function stopLoadingSteps() {
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current)
      loadingTimerRef.current = null
    }
    setLoadingStep(0)
  }

  async function correctVoiceInput(rawText: string) {
    if (!rawText.trim()) return
    setIsCorrectingVoice(true)
    try {
      const res = await fetch("/api/ai/voice-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, context: { purpose: "고객메모", tone: "자연스러운" } }),
      })
      const data = await res.json()
      setExtraNotes(prev => (prev ? prev + " " : "") + (data.corrected ?? rawText))
    } catch {
      setExtraNotes(prev => (prev ? prev + " " : "") + rawText)
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

  async function handleSave() {
    if (!result) return
    setIsSaving(true)
    try {
      const customerDesc = [ageGroup, gender, occupation, income, familyStatus, mbtiType].filter(Boolean).join(", ")
      const outputText = [
        `[고객 정보] ${customerDesc}`,
        `[주요 관심사] ${mainConcern}`,
        existingInsurance ? `[기존 보험] ${existingInsurance}` : null,
        extraNotes ? `[메모] ${extraNotes}` : null,
        `\n[성향 분석]\n${result.personality}`,
        `\n[예측 니즈]\n${result.needs.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
        result.products.length > 0 ? `\n[추천 상품]\n${result.products.map((p, i) => `${i + 1}순위: ${p.name} — ${p.reason}`).join('\n')}` : null,
        result.firstLine ? `\n[추천 첫마디]\n"${result.firstLine}"` : null,
        result.cautions ? `\n[주의사항]\n${result.cautions}` : null,
      ].filter(Boolean).join('\n')

      const res = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'script',
          title: `고객 성향 분석: ${[customerName, ageGroup, gender, occupation].filter(Boolean).join(' ')}`,
          outputText,
          inputData: { customerName, ageGroup, gender, occupation, income, familyStatus, mainConcern, existingInsurance, extraNotes, personality, mbtiType },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedId(data.id)
      toast.success('내 결과물 보관함에 저장되었습니다!')
    } catch {
      toast.error('저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAnalyze() {
    if (!ageGroup) { toast.error("나이대를 선택해주세요"); return }
    if (!occupation.trim()) { toast.error("직업을 입력해주세요"); return }
    if (!mainConcern) { toast.error("주요 관심사를 선택해주세요"); return }

    setLoading(true)
    setResult(null)
    setSavedId(null)
    startLoadingSteps()

    try {
      const res = await fetch("/api/ai/customer-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageGroup, gender, occupation, income, familyStatus, hasChildren, existingInsurance, mainConcern, personality, mbtiType, extraNotes }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.limitExceeded) {
          toast.error("이번 달 사용 한도를 초과했습니다. 플랜을 업그레이드해주세요.")
        } else {
          toast.error(data.error ?? "분석에 실패했습니다")
        }
        return
      }

      setResult(data)
      setRemaining(data.remaining ?? 0)
      toast.success(data.cached ? "이전 분석 결과를 불러왔습니다" : "고객 성향 분석 완료!")
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      stopLoadingSteps()
      setLoading(false)
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} 복사 완료!`)
  }

  const scriptUsed = usage.scriptCount
  const scriptLimit = limits.scriptLimit

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          스크립트 사용량: <span className="font-semibold text-gray-900">{scriptUsed} / {scriptLimit}회</span>
        </p>
        {scriptUsed >= scriptLimit && (
          <span className="text-xs text-red-600 font-medium">한도 초과 — 업그레이드 필요</span>
        )}
      </div>

      <UsageWarningBanner
        featureLabel="성향분석·스크립트"
        used={scriptUsed}
        limit={scriptLimit}
        recommendedPlanId={planId === 'pro' ? 'premium' : planId === 'basic' ? 'pro' : null}
        inline
      />

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("form")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "form"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          고객 정보 입력
        </button>
        {planName !== "무료" && (
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "qr"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            MBTI 간이검사 QR
          </button>
        )}
      </div>

      {/* QR 탭 — 유료 사용자만 */}
      {activeTab === "qr" && planName !== "무료" && (
        <Card className="border-orange-200">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">MBTI 간이검사</h3>
              <p className="text-sm text-gray-500">고객이 스마트폰으로 QR코드를 스캔하면 바로 검사를 시작할 수 있습니다</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md border">
              <QRCode value={MBTI_URL} size={200} />
            </div>
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg px-4 py-2 text-sm text-orange-700 dark:text-orange-300">
              <span>📱</span>
              <span>검사 후 나온 MBTI 유형을 아래 입력 폼에 선택해주세요</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("form")}>
              ← 고객 정보 입력으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 입력 폼 */}
      {activeTab === "form" && <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-orange-500" />
            고객 정보 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customers.length > 0 && (
            <div className="space-y-1.5">
              <Label>기존 고객 불러오기 <span className="text-gray-400 text-xs">(선택)</span></Label>
              <select
                value={selectedCustomerId}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">직접 입력</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                선택하면 이름·나이대·성별·직업·가족상황이 자동으로 채워집니다. 나이대·가족상황은
                고객관리 등록 정보를 기준으로 한 근사치이니 정확한지 확인해주세요.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>고객 이름 (선택)</Label>
            <Input placeholder="예: 홍길동" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            <p className="text-xs text-gray-400">입력해두면 이 분석 결과를 문자·스크립트 생성 시 불러올 때 고객 이름도 함께 채워집니다</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>나이대 <span className="text-red-500">*</span></Label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>성별</Label>
              <select value={gender} onChange={e => setGender(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>직업 <span className="text-red-500">*</span></Label>
              <Input placeholder="예: 직장인, 자영업자..." value={occupation} onChange={e => setOccupation(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>소득 수준</Label>
              <select value={income} onChange={e => setIncome(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                {INCOME_LEVELS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>가족 상황</Label>
              <select value={familyStatus} onChange={e => setFamilyStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                {FAMILY_STATUS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {/* MBTI 유형 — 성격 유형 앞에 배치 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>MBTI 유형 <span className="text-gray-400 text-xs">(선택)</span></Label>
                {planName !== "무료" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("qr")}
                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
                  >
                    <QrCode className="h-3 w-3" />
                    QR 검사
                  </button>
                )}
              </div>
              <select
                value={mbtiType}
                onChange={e => { setMbtiType(e.target.value); if (e.target.value) setPersonality("") }}
                disabled={!!personality}
                className={`w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-opacity ${personality ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <option value="">모름 / 미검사</option>
                {MBTI_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {personality && <p className="text-xs text-gray-400">성격 유형 선택 시 비활성화</p>}
            </div>
          </div>

          {/* 성격 유형 + 기존 보험 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>성격 유형</Label>
              <select
                value={personality}
                onChange={e => { setPersonality(e.target.value); if (e.target.value) setMbtiType("") }}
                disabled={!!mbtiType}
                className={`w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-opacity ${mbtiType ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <option value="">선택</option>
                {PERSONALITY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {mbtiType && <p className="text-xs text-gray-400">MBTI 선택 시 비활성화</p>}
            </div>
            <div className="space-y-1.5">
              <Label>기존 보험 현황</Label>
              <Input placeholder="예: 실손보험 있음, 생명보험 없음..." value={existingInsurance} onChange={e => setExistingInsurance(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>주요 관심사/걱정 <span className="text-red-500">*</span></Label>
            <select value={mainConcern} onChange={e => setMainConcern(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">선택</option>
              {CONCERNS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>추가 메모 <span className="text-gray-400 text-xs">(선택)</span></Label>
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
            <Textarea placeholder="상담 시 파악한 특이사항, 고객의 말투, 반응 등..." value={extraNotes} onChange={e => setExtraNotes(e.target.value)} rows={2} className="resize-none text-sm" />
            <p className="text-xs text-gray-400">마이크 버튼으로 음성 입력도 가능합니다. 어설픈 발음도 AI가 자동 교정합니다.</p>
          </div>

          <Button onClick={handleAnalyze} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
            {loading
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{LOADING_STEPS[loadingStep]}</>
              : <><Brain className="h-4 w-4 mr-2" />고객 성향 분석하기</>
            }
          </Button>
          {loading && (
            <div className="flex justify-center gap-1.5 pt-1">
              {LOADING_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= loadingStep ? 'w-8 bg-orange-400' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>}

      {/* 결과 */}
      {result && (
        <div className="space-y-4">
          {/* 키워드 */}
          {result.keywords.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="text-sm font-medium text-gray-700">핵심 키워드:</span>
              {result.keywords.map((k, i) => (
                <Badge key={i} className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">{k}</Badge>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* 성향 분석 */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm">성향 분석</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.personality}</p>
              </CardContent>
            </Card>

            {/* 예측 니즈 */}
            <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-sm">예측 니즈</span>
                </div>
                <ul className="space-y-1.5">
                  {result.needs.map((need, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-200 shrink-0 mt-0.5">{i + 1}</span>
                      {need}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 추천 상품 */}
          {result.products.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold text-sm">맞춤 상품 추천</span>
                </div>
                <div className="space-y-2">
                  {result.products.map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${i === 0 ? "bg-orange-500 text-white" : i === 1 ? "bg-orange-300 text-orange-900" : "bg-orange-200 text-orange-800"}`}>
                        {i + 1}순위
                      </span>
                      <div>
                        <span className="font-medium text-sm text-gray-900">{p.name}</span>
                        <span className="text-xs text-gray-500 ml-2">— {p.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 첫마디 */}
          {result.firstLine && (
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-sm">추천 첫마디</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copy(result.firstLine, "첫마디")} className="h-7 px-2 text-xs">
                    <Copy className="h-3 w-3 mr-1" />복사
                  </Button>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-purple-100">
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    &ldquo;{result.firstLine}&rdquo;
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 주의사항 */}
          {result.cautions && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-semibold text-sm text-red-700 dark:text-red-400">주의사항</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{result.cautions}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 분석
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !!savedId}
              className={savedId ? "bg-green-600 hover:bg-green-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
            >
              {isSaving ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />저장 중</>
              ) : savedId ? (
                <><BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />저장 완료</>
              ) : (
                <><Save className="h-3.5 w-3.5 mr-1.5" />보관함에 저장</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
