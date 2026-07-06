"use client"

import { useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { PageTracker } from "@/components/analytics/page-tracker"
import { Calculator, TrendingUp, PiggyBank, Sparkles, ChevronRight, Info, Printer } from "lucide-react"

interface CalcInput {
  currentAge: number
  retireAge: number
  lifeExpectancy: number
  monthlyExpense: number        // 은퇴 후 월 생활비 (만원)
  currentSavings: number        // 현재 저축액 (만원)
  monthlyContrib: number        // 월 저축 가능액 (만원)
  returnRate: number            // 연 수익률 (%)
  inflationRate: number         // 물가상승률 (%)
  nationalPension: number       // 예상 국민연금 수령액 (만원)
}

function formatWon(man: number) {
  if (man >= 10000) return `${(man / 10000).toFixed(1)}억원`
  return `${man.toLocaleString()}만원`
}

function calcPension(input: CalcInput) {
  const {
    currentAge, retireAge, lifeExpectancy,
    monthlyExpense, currentSavings, monthlyContrib,
    returnRate, inflationRate, nationalPension,
  } = input

  const yearsToRetire = Math.max(retireAge - currentAge, 1)
  const retirementYears = Math.max(lifeExpectancy - retireAge, 1)

  const monthlyReturn = returnRate / 100 / 12
  const monthlyInflation = inflationRate / 100 / 12
  const nMonths = yearsToRetire * 12
  const rMonths = retirementYears * 12

  // 은퇴 시점 필요 월 생활비 (물가상승률 반영)
  const inflatedMonthlyExpense = monthlyExpense * Math.pow(1 + inflationRate / 100, yearsToRetire)
  // 국민연금도 물가 반영
  const inflatedNationalPension = nationalPension * Math.pow(1 + inflationRate / 100, yearsToRetire)
  // 실제 자기부담 월 생활비
  const netMonthlyExpense = Math.max(inflatedMonthlyExpense - inflatedNationalPension, 0)

  // 은퇴 후 필요 총 자산 (연금 현가 공식)
  let totalNeeded: number
  if (monthlyReturn <= monthlyInflation) {
    totalNeeded = netMonthlyExpense * rMonths
  } else {
    const realRate = (monthlyReturn - monthlyInflation) / (1 + monthlyInflation)
    totalNeeded = netMonthlyExpense * (1 - Math.pow(1 + realRate, -rMonths)) / realRate
  }

  // 현재 저축액의 은퇴 시점 미래가치
  const futureSavings = currentSavings * Math.pow(1 + monthlyReturn, nMonths)

  // 월 저축액의 은퇴 시점 미래가치
  let futureContrib = 0
  if (monthlyReturn > 0) {
    futureContrib = monthlyContrib * ((Math.pow(1 + monthlyReturn, nMonths) - 1) / monthlyReturn)
  } else {
    futureContrib = monthlyContrib * nMonths
  }

  const totalProjected = futureSavings + futureContrib
  const shortfall = Math.max(totalNeeded - totalProjected, 0)

  // 부족액을 채우기 위한 추가 월 저축액
  let additionalMonthly = 0
  if (shortfall > 0 && nMonths > 0) {
    if (monthlyReturn > 0) {
      additionalMonthly = shortfall / ((Math.pow(1 + monthlyReturn, nMonths) - 1) / monthlyReturn)
    } else {
      additionalMonthly = shortfall / nMonths
    }
  }

  const totalRequired = monthlyContrib + additionalMonthly
  const preparednessRate = Math.min((totalProjected / totalNeeded) * 100, 100)

  return {
    yearsToRetire,
    retirementYears,
    inflatedMonthlyExpense: Math.round(inflatedMonthlyExpense),
    inflatedNationalPension: Math.round(inflatedNationalPension),
    netMonthlyExpense: Math.round(netMonthlyExpense),
    totalNeeded: Math.round(totalNeeded),
    futureSavings: Math.round(futureSavings),
    futureContrib: Math.round(futureContrib),
    totalProjected: Math.round(totalProjected),
    shortfall: Math.round(shortfall),
    additionalMonthly: Math.round(additionalMonthly),
    totalRequired: Math.round(totalRequired),
    preparednessRate: Math.round(preparednessRate),
  }
}

const DEFAULT: CalcInput = {
  currentAge: 40,
  retireAge: 65,
  lifeExpectancy: 85,
  monthlyExpense: 250,
  currentSavings: 3000,
  monthlyContrib: 50,
  returnRate: 5,
  inflationRate: 2.5,
  nationalPension: 80,
}

export default function PensionCalculatorPage() {
  const router = useRouter()
  const [input, setInput] = useState<CalcInput>(DEFAULT)
  const [customerName, setCustomerName] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  const result = useMemo(() => calcPension(input), [input])

  function handlePrint() {
    window.print()
  }

  function set(key: keyof CalcInput, val: number) {
    setInput(prev => ({ ...prev, [key]: val }))
  }

  function goToScript() {
    const params = new URLSearchParams({
      pension_calc: "1",
      current_age: String(input.currentAge),
      retire_age: String(input.retireAge),
      life_expectancy: String(input.lifeExpectancy),
      monthly_expense: String(input.monthlyExpense),
      current_savings: String(input.currentSavings),
      monthly_contrib: String(input.monthlyContrib),
      return_rate: String(input.returnRate),
      inflation_rate: String(input.inflationRate),
      national_pension: String(input.nationalPension),
      total_needed: String(result.totalNeeded),
      shortfall: String(result.shortfall),
      additional_monthly: String(result.additionalMonthly),
      preparedness_rate: String(result.preparednessRate),
    })
    router.push(`/ai-script?${params.toString()}`)
  }

  const gaugeColor =
    result.preparednessRate >= 80 ? "#1a7f4e" :
    result.preparednessRate >= 50 ? "#c97d0a" : "#b93232"

  return (
    <div className="space-y-6 max-w-4xl">
      <PageTracker event="pension_calculator_visit" />

      {/* 인쇄 전용 CSS */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* 사이드바, 헤더, 하단 네비 숨기기 */
          aside,
          header,
          nav,
          [class*="bottom-nav"],
          [class*="BottomNav"] {
            display: none !important;
          }
          /* 사이드바 여백 제거 */
          [class*="md:pl-64"],
          .md\\:pl-64 {
            padding-left: 0 !important;
          }
          body * { visibility: hidden !important; }
          #pension-print-area,
          #pension-print-area * { visibility: visible !important; }
          #pension-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            zoom: 0.68;
          }
          /* 2컬럼 그리드 강제 유지 */
          #pension-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          /* 배경색 보존 */
          .bg-red-50 { background-color: #fef2f2 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-orange-50 { background-color: #fff7ed !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          연금 계산기
        </h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="고객 이름 입력"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-36 h-9 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9"
          >
            <Printer className="h-4 w-4" />
            인쇄 / PDF 저장
          </Button>
        </div>
      </div>

      <div id="pension-print-area" ref={printRef}>

      {/* 인쇄 시 헤더 */}
      <div className="print-header mb-4 pb-3 border-b-2 border-[#1e3a5f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#1e3a5f]" />
            <span className="text-lg font-bold text-[#1e3a5f]">은퇴 준비 분석 리포트</span>
          </div>
          {customerName && (
            <span className="text-base font-semibold text-gray-700">{customerName} 고객님</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">작성일: {new Date().toLocaleDateString("ko-KR")} | FP AI Assistant</p>
      </div>

      <div id="pension-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 입력 패널 */}
        <div className="space-y-4">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f]">고객 기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">현재 나이</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={input.currentAge}
                      min={20} max={70}
                      onChange={e => set("currentAge", +e.target.value)}
                      className="text-center"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">세</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">은퇴 목표 나이</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={input.retireAge}
                      min={input.currentAge + 1} max={80}
                      onChange={e => set("retireAge", +e.target.value)}
                      className="text-center"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">세</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">기대 수명</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={input.lifeExpectancy}
                      min={input.retireAge + 1} max={100}
                      onChange={e => set("lifeExpectancy", +e.target.value)}
                      className="text-center"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">세</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f]">은퇴 후 생활 계획</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">은퇴 후 월 생활비</Label>
                  <span className="text-xs font-semibold text-[#1e3a5f]">{input.monthlyExpense}만원</span>
                </div>
                <Slider
                  value={[input.monthlyExpense]}
                  min={50} max={700} step={10}
                  onValueChange={([v]: number[]) => set("monthlyExpense", v)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>50만원</span><span>700만원</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">예상 국민연금 수령액</Label>
                  <span className="text-xs font-semibold text-[#1e3a5f]">{input.nationalPension}만원/월</span>
                </div>
                <Slider
                  value={[input.nationalPension]}
                  min={0} max={300} step={5}
                  onValueChange={([v]: number[]) => set("nationalPension", v)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0만원</span><span>300만원</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f]">현재 자산 & 저축 계획</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">현재 은퇴 저축액 (합계)</Label>
                  <span className="text-xs font-semibold text-[#1e3a5f]">{formatWon(input.currentSavings)}</span>
                </div>
                <Slider
                  value={[input.currentSavings]}
                  min={0} max={50000} step={500}
                  onValueChange={([v]: number[]) => set("currentSavings", v)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span><span>5억원</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">월 저축 가능 금액</Label>
                  <span className="text-xs font-semibold text-[#1e3a5f]">{input.monthlyContrib}만원</span>
                </div>
                <Slider
                  value={[input.monthlyContrib]}
                  min={0} max={500} step={5}
                  onValueChange={([v]: number[]) => set("monthlyContrib", v)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0만원</span><span>500만원</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f]">수익률 & 물가상승률 가정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">연 기대 수익률</Label>
                  <span className="text-xs font-semibold text-[#1e3a5f]">{input.returnRate}%</span>
                </div>
                <Slider
                  value={[input.returnRate]}
                  min={1} max={12} step={0.5}
                  onValueChange={([v]: number[]) => set("returnRate", v)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1% (예금)</span><span>12% (적극 투자)</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">연 물가상승률</Label>
                  <span className="text-xs font-semibold text-[#1e3a5f]">{input.inflationRate}%</span>
                </div>
                <Slider
                  value={[input.inflationRate]}
                  min={1} max={5} step={0.5}
                  onValueChange={([v]: number[]) => set("inflationRate", v)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1%</span><span>5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 결과 패널 */}
        <div className="space-y-4">

          {/* 준비도 게이지 */}
          <Card className="border-2" style={{ borderColor: gaugeColor + "44" }}>
            <CardContent className="pt-5">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 mb-1">은퇴 준비도</p>
                <div className="text-5xl font-bold tabular-nums" style={{ color: gaugeColor }}>
                  {result.preparednessRate}%
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {result.preparednessRate >= 80 ? "✅ 은퇴 준비 양호" :
                   result.preparednessRate >= 50 ? "⚠️ 추가 준비 필요" : "🚨 은퇴 준비 부족"}
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${result.preparednessRate}%`, background: gaugeColor }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">은퇴까지 남은 기간</p>
                  <p className="text-lg font-bold text-[#1e3a5f]">{result.yearsToRetire}년</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">은퇴 후 생활 기간</p>
                  <p className="text-lg font-bold text-[#1e3a5f]">{result.retirementYears}년</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 필요 자산 분석 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                필요 자산 분석
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="text-sm font-medium">은퇴 시 월 생활비 (물가 반영)</p>
                  <p className="text-xs text-gray-400">현재 {input.monthlyExpense}만원 → {input.retireAge}세 기준</p>
                </div>
                <span className="font-semibold text-sm">{formatWon(result.inflatedMonthlyExpense)}/월</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="text-sm font-medium">국민연금 수령액 (물가 반영)</p>
                  <p className="text-xs text-gray-400">은퇴 시점 기준 예상액</p>
                </div>
                <span className="font-semibold text-sm text-green-600">–{formatWon(result.inflatedNationalPension)}/월</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="text-sm font-medium">실질 자기부담 생활비</p>
                  <p className="text-xs text-gray-400">국민연금 차감 후</p>
                </div>
                <span className="font-bold text-[#1e3a5f]">{formatWon(result.netMonthlyExpense)}/월</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-red-50 rounded-lg px-3">
                <div>
                  <p className="text-sm font-bold text-red-700">은퇴 시 필요 총 자산</p>
                  <p className="text-xs text-gray-400">{result.retirementYears}년치 생활비 현가</p>
                </div>
                <span className="font-bold text-red-700 text-base">{formatWon(result.totalNeeded)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 예상 자산 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-1.5">
                <PiggyBank className="h-4 w-4" />
                현재 계획대로라면
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="text-sm font-medium">현재 저축액 미래가치</p>
                  <p className="text-xs text-gray-400">연 {input.returnRate}% 수익률 적용</p>
                </div>
                <span className="font-semibold text-sm">{formatWon(result.futureSavings)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="text-sm font-medium">월 {input.monthlyContrib}만원 저축 미래가치</p>
                  <p className="text-xs text-gray-400">{result.yearsToRetire}년간 복리 적립</p>
                </div>
                <span className="font-semibold text-sm">{formatWon(result.futureContrib)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-blue-50 rounded-lg px-3">
                <p className="text-sm font-bold text-[#1e3a5f]">은퇴 시 예상 총 자산</p>
                <span className="font-bold text-[#1e3a5f] text-base">{formatWon(result.totalProjected)}</span>
              </div>

              {result.shortfall > 0 ? (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm font-bold text-orange-700">💰 부족 예상 금액</p>
                    <span className="font-bold text-orange-700">{formatWon(result.shortfall)}</span>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-orange-600">추가 필요 월 저축액</p>
                    <span className="font-bold text-orange-600">+{formatWon(result.additionalMonthly)}/월</span>
                  </div>
                  <div className="flex justify-between border-t border-orange-200 pt-2">
                    <p className="text-sm font-bold text-[#1e3a5f]">권장 월 저축액 합계</p>
                    <span className="font-bold text-[#1e3a5f]">{formatWon(result.totalRequired)}/월</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-sm font-bold text-green-700 text-center">
                    ✅ 현재 계획으로 은퇴 자금 충분히 준비됩니다!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI 스크립트 연결 버튼 */}
          <Card className="bg-[#1e3a5f] border-0 no-print">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">이 분석 결과로 상담 스크립트 생성</p>
                  <p className="text-blue-300 text-xs mt-0.5">
                    계산된 수치가 자동으로 입력되어 정확한 맞춤 스크립트를 생성합니다
                  </p>
                </div>
              </div>
              <Button
                onClick={goToScript}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                AI 상담 스크립트 바로 생성
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* 안내 */}
          <div className="flex gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3 no-print">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <p>본 계산기는 참고용이며 실제 결과는 수익률, 물가, 세금 등에 따라 달라질 수 있습니다. 전문 FP 상담을 병행하세요.</p>
          </div>

          {/* 인쇄 시 하단 면책 문구 */}
          <div className="print-header mt-4 pt-3 border-t text-xs text-gray-400">
            <p>※ 본 분석은 참고용이며 실제 결과는 수익률·물가·세금 등에 따라 달라질 수 있습니다. 전문 FP 상담을 병행하시기 바랍니다.</p>
          </div>
        </div>
      </div>

      </div>{/* pension-print-area end */}
    </div>
  )
}
