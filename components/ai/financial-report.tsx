"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { FileText, RefreshCw, Printer, Copy, CheckCircle, AlertCircle, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { MonthlyUsageData } from "@/lib/subscription/usage"
import type { PlanLimits } from "@/lib/subscription/plans"

const AGE_GROUPS = ["20대", "30대 초반", "30대 후반", "40대 초반", "40대 후반", "50대", "60대 이상"]
const FAMILY_STATUS = ["미혼", "기혼 (자녀 없음)", "기혼 (자녀 1명)", "기혼 (자녀 2명 이상)", "이혼/사별"]
const FINANCIAL_GOALS = ["노후 자금 마련", "자녀 교육비 준비", "내 집 마련", "부채 상환", "조기 은퇴", "건강 보장 강화", "가족 보장 강화"]

interface ReportResult {
  customerName: string
  ageGroup: string
  monthlyIncome: string
  affordablePremium: number
  currentInsurancePremium: string
  financialGoal: string
  summary: string
  coverage: Record<string, string>
  priorities: Array<{ area: string; reason: string }>
  recommendedPlan: string
  actionPlan: Record<string, string>
  agentMemo: string
}

interface FinancialReportProps {
  planName: string
  limits: PlanLimits
  usage: MonthlyUsageData
}

export function FinancialReport({ planName, limits, usage }: FinancialReportProps) {
  const [customerName, setCustomerName] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [gender, setGender] = useState("")
  const [occupation, setOccupation] = useState("")
  const [familyStatus, setFamilyStatus] = useState("")
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [monthlyExpense, setMonthlyExpense] = useState("")
  const [currentInsurancePremium, setCurrentInsurancePremium] = useState("")
  const [savings, setSavings] = useState("")
  const [debt, setDebt] = useState("")
  const [financialGoal, setFinancialGoal] = useState("")
  const [existingInsurance, setExistingInsurance] = useState("")
  const [healthStatus, setHealthStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportResult | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  async function handleGenerate() {
    if (!ageGroup) { toast.error("나이대를 선택해주세요"); return }
    if (!monthlyIncome.trim()) { toast.error("월 소득을 입력해주세요"); return }
    if (!financialGoal) { toast.error("재무 목표를 선택해주세요"); return }

    setLoading(true)
    setReport(null)
    try {
      const res = await fetch("/api/ai/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, ageGroup, gender, occupation, familyStatus, monthlyIncome, monthlyExpense, currentInsurancePremium, savings, debt, financialGoal, existingInsurance, healthStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.limitExceeded ? "이번 달 사용 한도를 초과했습니다." : (data.error ?? "생성 실패"))
        return
      }
      setReport(data)
      toast.success(data.cached ? "이전 리포트를 불러왔습니다" : "재무설계 리포트가 생성되었습니다!")
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleCopyAll() {
    if (!report) return
    const text = [
      `■ 보장 분석 리포트 — ${report.customerName} 고객`,
      `작성일: ${new Date().toLocaleDateString('ko-KR')}`,
      '',
      '【종합 평가】',
      report.summary,
      '',
      '【보장 분석】',
      ...Object.entries(report.coverage).map(([k, v]) => `${k}: ${v}`),
      '',
      '【우선순위】',
      ...report.priorities.map((p, i) => `${i + 1}순위: ${p.area} — ${p.reason}`),
      '',
      '【추천 플랜】',
      report.recommendedPlan,
      '',
      '【실행 계획】',
      ...Object.entries(report.actionPlan).map(([k, v]) => `${k}: ${v}`),
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success("리포트 전체 복사 완료!")
  }

  const coverageIcons: Record<string, string> = {
    "사망보장": "🛡️", "의료보장": "🏥", "노후보장": "🏦", "재해보장": "⚡"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          스크립트 사용량: <span className="font-semibold text-gray-900">{usage.scriptCount} / {limits.scriptLimit}회</span>
        </p>
      </div>

      {/* 입력 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-orange-500" />
            고객 재무 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>고객 이름 <span className="text-gray-400 text-xs">(선택)</span></Label>
              <Input placeholder="홍길동" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>직업</Label>
              <Input placeholder="예: 직장인, 자영업자..." value={occupation} onChange={e => setOccupation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>가족 상황</Label>
              <select value={familyStatus} onChange={e => setFamilyStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                {FAMILY_STATUS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <Separator />

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">재무 현황 (만원/월)</p>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>월 소득 <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="300" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>월 지출</Label>
              <Input type="number" placeholder="200" value={monthlyExpense} onChange={e => setMonthlyExpense(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>현재 보험료</Label>
              <Input type="number" placeholder="15" value={currentInsurancePremium} onChange={e => setCurrentInsurancePremium(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>저축/투자</Label>
              <Input type="number" placeholder="50" value={savings} onChange={e => setSavings(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>부채 현황</Label>
              <Input placeholder="예: 주택담보대출 2억" value={debt} onChange={e => setDebt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>재무 목표 <span className="text-red-500">*</span></Label>
              <select value={financialGoal} onChange={e => setFinancialGoal(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                {FINANCIAL_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>기존 보험</Label>
              <Input placeholder="예: 실손, 암보험..." value={existingInsurance} onChange={e => setExistingInsurance(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
            {loading
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />리포트 생성 중...</>
              : <><FileText className="h-4 w-4 mr-2" />보장 분석 리포트 생성</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* 리포트 결과 */}
      {report && (
        <div ref={printRef} className="space-y-4">
          {/* 리포트 헤더 */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">보장 분석 리포트</p>
                <h2 className="text-xl font-bold">{report.customerName} 고객</h2>
                <p className="text-blue-200 text-sm mt-1">
                  {report.ageGroup} · 월 소득 {report.monthlyIncome}만원 · 목표: {report.financialGoal}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs">{new Date().toLocaleDateString('ko-KR')}</p>
                <p className="text-white text-sm font-medium mt-1">적정 보험료 여력</p>
                <p className="text-2xl font-bold text-orange-300">월 {report.affordablePremium}만원</p>
                <p className="text-blue-300 text-xs">현재 납입: {report.currentInsurancePremium}만원/월</p>
              </div>
            </div>
          </div>

          {/* 종합 평가 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">종합 평가</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
            </CardContent>
          </Card>

          {/* 보장 분석 */}
          {Object.keys(report.coverage).length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <p className="font-semibold text-sm mb-3">보장 영역별 분석</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(report.coverage).map(([area, desc]) => (
                    <div key={area} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                        {coverageIcons[area] ?? "📋"} {area}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 우선순위 */}
          {report.priorities.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold text-sm">보완 우선순위</span>
                </div>
                <div className="space-y-2">
                  {report.priorities.map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${i === 0 ? "bg-red-500 text-white" : i === 1 ? "bg-orange-400 text-white" : "bg-yellow-400 text-yellow-900"}`}>
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-medium text-sm text-gray-900">{p.area}</span>
                        <span className="text-xs text-gray-500 ml-2">— {p.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 추천 플랜 */}
          {report.recommendedPlan && (
            <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="pt-4">
                <p className="font-semibold text-sm mb-2 text-emerald-800 dark:text-emerald-300">💡 맞춤 포트폴리오 제안</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{report.recommendedPlan}</p>
              </CardContent>
            </Card>
          )}

          {/* 실행 계획 */}
          {Object.keys(report.actionPlan).length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm">실행 계획</span>
                </div>
                <div className="space-y-2">
                  {[["단기", "bg-red-100 text-red-700"], ["중기", "bg-orange-100 text-orange-700"], ["장기", "bg-blue-100 text-blue-700"]].map(([period, cls]) =>
                    report.actionPlan[period] ? (
                      <div key={period} className="flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${cls}`}>{period}</span>
                        <p className="text-sm text-gray-700">{report.actionPlan[period]}</p>
                      </div>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 설계사 메모 (인쇄 시 숨김) */}
          {report.agentMemo && (
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 print:hidden">
              <CardContent className="pt-4">
                <p className="font-semibold text-sm mb-2 text-purple-800 dark:text-purple-300">🔒 설계사 메모 (고객 미공개)</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{report.agentMemo}</p>
              </CardContent>
            </Card>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />전체 복사
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />인쇄하기
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 생성
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
