"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Bell, RefreshCw, Copy, CalendarPlus, ChevronDown, ChevronUp, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { MonthlyUsageData } from "@/lib/subscription/usage"
import type { PlanLimits } from "@/lib/subscription/plans"

interface Customer {
  id: string
  name: string
  age_group: string
  gender: string
  job: string
  family_status: string
  children_status: string
  interest_products: string[]
  memo: string
}

interface Timing {
  index: number
  timing: string
  title: string
  reason: string
  message: string
  product: string
}

interface LifecycleAlertProps {
  planName: string
  limits: PlanLimits
  usage: MonthlyUsageData
}

const MONTH_COLORS = [
  "bg-red-100 text-red-700 border-red-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-yellow-100 text-yellow-700 border-yellow-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-purple-100 text-purple-700 border-purple-200",
]

export function LifecycleAlert({ planName, limits, usage }: LifecycleAlertProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [birthMonth, setBirthMonth] = useState("")
  const [contractDate, setContractDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [timings, setTimings] = useState<Timing[]>([])
  const [summary, setSummary] = useState("")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/customers")
      const data = await res.json()
      setCustomers(data.customers ?? [])
    } catch {
      toast.error("고객 목록을 불러오지 못했습니다")
    } finally {
      setLoadingCustomers(false)
    }
  }

  async function handleAnalyze() {
    if (!selectedCustomer) { toast.error("고객을 선택해주세요"); return }

    setLoading(true)
    setTimings([])
    setSummary("")

    try {
      const res = await fetch("/api/ai/lifecycle-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: selectedCustomer.name,
          ageGroup: selectedCustomer.age_group,
          gender: selectedCustomer.gender,
          occupation: selectedCustomer.job,
          familyStatus: selectedCustomer.family_status,
          childrenStatus: selectedCustomer.children_status,
          interestProducts: selectedCustomer.interest_products,
          memo: selectedCustomer.memo,
          birthMonth,
          contractDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.limitExceeded ? "이번 달 사용 한도를 초과했습니다." : (data.error ?? "분석 실패"))
        return
      }

      setTimings(data.timings ?? [])
      setSummary(data.summary ?? "")
      setExpandedIndex(0)
      toast.success(data.cached ? "이전 분석 결과를 불러왔습니다" : `${selectedCustomer.name} 고객 생애주기 분석 완료!`)
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  async function addToCalendar(timing: Timing) {
    if (!selectedCustomer) return
    try {
      const res = await fetch("/api/calendar/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[생애주기] ${selectedCustomer.name} — ${timing.title}`,
          description: `${timing.reason}\n\n추천 멘트: "${timing.message}"${timing.product !== "관계 유지" ? `\n추천 상품: ${timing.product}` : ""}`,
          taskDate: new Date().toISOString().slice(0, 10),
          taskType: "followup",
          customerId: selectedCustomer.id,
        }),
      })
      if (res.ok) {
        toast.success("업무 캘린더에 추가되었습니다!")
      } else {
        toast.error("캘린더 추가에 실패했습니다")
      }
    } catch {
      toast.error("캘린더 추가 중 오류가 발생했습니다")
    }
  }

  function copyMessage(message: string, name: string) {
    navigator.clipboard.writeText(message)
    toast.success(`${name} 멘트 복사 완료!`)
  }

  const filteredCustomers = customers.filter(c =>
    c.name.includes(searchQuery) || (c.job ?? "").includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          사용량: <span className="font-semibold text-gray-900">{usage.smsCount} / {limits.smsLimit}회</span>
        </p>
      </div>

      {/* 고객 선택 */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              고객 선택 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="고객 이름 또는 직업 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingCustomers ? (
              <p className="text-sm text-gray-400 py-2">고객 목록 불러오는 중...</p>
            ) : filteredCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">등록된 고객이 없습니다. 먼저 고객을 등록해주세요.</p>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                      selectedCustomer?.id === c.id
                        ? "bg-orange-500 text-white"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      selectedCustomer?.id === c.id ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"
                    }`}>
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className={`text-xs ${selectedCustomer?.id === c.id ? "text-orange-100" : "text-gray-400"}`}>
                        {c.age_group} {c.gender} {c.job ? `· ${c.job}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 추가 정보 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>생일 월 <span className="text-gray-400 text-xs">(선택)</span></Label>
              <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">선택</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={String(m)}>{m}월</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>보험 가입 시기 <span className="text-gray-400 text-xs">(선택)</span></Label>
              <Input placeholder="예: 2022년 3월, 3년 전..." value={contractDate} onChange={e => setContractDate(e.target.value)} />
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !selectedCustomer}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            size="lg"
          >
            {loading
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />분석 중...</>
              : <><Bell className="h-4 w-4 mr-2" />생애주기 연락 타이밍 분석</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* 결과 */}
      {timings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{selectedCustomer?.name} 고객 연락 로드맵</h2>
            <Badge variant="outline">{timings.length}개 타이밍</Badge>
          </div>

          {timings.map((timing, i) => {
            const colorClass = MONTH_COLORS[i % MONTH_COLORS.length]
            const isExpanded = expandedIndex === i
            return (
              <Card key={i} className="overflow-hidden">
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${colorClass}`}>
                    {timing.timing}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{timing.title}</p>
                    <p className="text-xs text-gray-500 truncate">{timing.reason}</p>
                  </div>
                  {timing.product !== "관계 유지" && (
                    <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100 shrink-0">{timing.product}</Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t">
                    <p className="text-sm text-gray-600 dark:text-gray-400 pt-3">{timing.reason}</p>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1.5 font-medium">추천 멘트</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        &ldquo;{timing.message}&rdquo;
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyMessage(timing.message, timing.title)} className="flex-1">
                        <Copy className="h-3.5 w-3.5 mr-1.5" />멘트 복사
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addToCalendar(timing)} className="flex-1">
                        <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />캘린더 추가
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}

          {/* 총평 */}
          {summary && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-4">
                <p className="font-semibold text-sm text-orange-800 dark:text-orange-300 mb-2">💡 전략 총평</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 분석
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
