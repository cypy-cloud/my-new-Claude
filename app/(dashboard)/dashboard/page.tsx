import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare, BookOpen, FileText, ArrowRight, TrendingUp,
  Zap, CreditCard, AlertCircle, MessageCircle, UserSearch,
  FileEdit, Newspaper, ShieldOff
} from "lucide-react"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const yearMonth = new Date().toISOString().slice(0, 7)

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("full_name, email, plan_type")
    .eq("id", user!.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? "free"
  const planName = PLAN_LABELS[planId]
  const limits = getPlanLimits(planId)
  const usage = await getMonthlyUsage(user!.id)

  // 플랜별로 보여줄 사용량 카드 정의 (limit > 0인 것만 표시)
  const allStats = [
    {
      label: "AI 문자/카톡",
      used: usage.smsCount,
      limit: limits.smsLimit,
      icon: MessageSquare,
      color: "blue",
      href: "/ai-message",
    },
    {
      label: "AI 상담 스크립트",
      used: usage.scriptCount,
      limit: limits.scriptLimit,
      icon: BookOpen,
      color: "purple",
      href: "/ai-script",
    },
    {
      label: "AI 성향분석",
      used: usage.scriptCount,   // 성향분석도 scriptCount 공유
      limit: limits.scriptLimit,
      icon: UserSearch,
      color: "indigo",
      href: "/customer-analysis",
      sharedWith: "AI 상담 스크립트와 한도 공유",
    },
    {
      label: "거절극복 스크립트",
      used: usage.followupCount,
      limit: limits.followupLimit,
      icon: ShieldOff,
      color: "rose",
      href: "/objection-handler",
    },
    {
      label: "AI PDF 분석",
      used: usage.pdfAnalysisCount,
      limit: limits.pdfAnalysisLimit,
      icon: FileText,
      color: "orange",
      href: "/ai-document",
    },
    {
      label: "SNS·블로그 콘텐츠",
      used: usage.contentCount,
      limit: limits.contentLimit,
      icon: FileEdit,
      color: "green",
      href: "/content-generator",
    },
    {
      label: "뉴스레터 생성",
      used: usage.newsletterCount,
      limit: limits.newsletterLimit,
      icon: Newspaper,
      color: "teal",
      href: "/newsletter",
    },
  ].filter(s => s.limit > 0)

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    indigo: "bg-indigo-500",
    rose: "bg-rose-500",
    orange: "bg-orange-500",
    green: "bg-green-500",
    teal: "bg-teal-500",
  }

  const iconBgMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    indigo: "bg-indigo-100 text-indigo-600",
    rose: "bg-rose-100 text-rose-500",
    orange: "bg-orange-100 text-orange-500",
    green: "bg-green-100 text-green-600",
    teal: "bg-teal-100 text-teal-600",
  }

  const warningBorderMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
    indigo: "border-indigo-200 bg-indigo-50",
    rose: "border-rose-200 bg-rose-50",
    orange: "border-orange-200 bg-orange-50",
    green: "border-green-200 bg-green-50",
    teal: "border-teal-200 bg-teal-50",
  }

  const quickActions = [
    { href: "/ai-message", label: "AI 문자 생성", desc: "고객 메시지 자동 작성", icon: MessageSquare, color: "blue" },
    { href: "/ai-script", label: "AI 스크립트", desc: "맞춤형 상담 스크립트", icon: BookOpen, color: "purple" },
    { href: "/ai-document", label: "AI PDF 분석", desc: "PDF 설명자료 자동화", icon: FileText, color: "orange" },
    ...(limits.contentLimit > 0
      ? [{ href: "/content-generator", label: "SNS·블로그", desc: "콘텐츠 자동 생성", icon: FileEdit, color: "green" }]
      : []),
    ...(limits.newsletterLimit > 0
      ? [{ href: "/newsletter", label: "뉴스레터", desc: "뉴스레터 자동 작성", icon: Newspaper, color: "teal" }]
      : []),
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            안녕하세요, {profile?.full_name ?? "설계사"}님! 👋
          </h1>
          <p className="text-gray-500 mt-1">오늘도 FP AI Assistant와 함께 효율적인 업무를 시작해보세요.</p>
        </div>
        <Badge className="self-start sm:self-auto bg-[#1e3a5f] text-white px-4 py-1.5 text-sm">
          {planName} 플랜
        </Badge>
      </div>

      {/* Usage Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">이번 달 사용량 ({yearMonth})</h2>
          {planId !== "premium" && (
            <Link href="/billing" className="text-xs text-orange-500 hover:underline font-medium">
              플랜 업그레이드 →
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStats.map((s) => {
            const Icon = s.icon
            const pct = s.limit > 0 ? Math.min(100, (s.used / s.limit) * 100) : 0
            const isWarning = pct >= 80 && pct < 100
            const isExhausted = pct >= 100

            return (
              <Link key={s.label} href={s.href}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer border shadow-sm ${
                  isExhausted
                    ? "border-red-200 bg-red-50"
                    : isWarning
                    ? `border ${warningBorderMap[s.color]}`
                    : "border-0 bg-white"
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isExhausted ? "bg-red-100 text-red-500" : iconBgMap[s.color]
                      }`}>
                        {isExhausted ? <AlertCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className={`text-2xl font-bold ${isExhausted ? "text-red-500" : "text-[#1e3a5f]"}`}>
                        {s.used}<span className="text-sm font-normal text-gray-400">/{s.limit}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{s.label}</p>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isExhausted ? "bg-red-400" : isWarning ? "bg-yellow-400" : colorMap[s.color]
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400">{Math.round(pct)}% 사용</span>
                      {isExhausted ? (
                        <span className="text-xs text-red-500 font-medium">한도 초과</span>
                      ) : (
                        <span className="text-xs text-gray-400">잔여 {s.limit - s.used}회</span>
                      )}
                    </div>
                    {'sharedWith' in s && s.sharedWith && (
                      <p className="text-xs text-gray-400 mt-1.5 border-t border-gray-100 pt-1.5">{s.sharedWith}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Plan Details */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{planName} 플랜 혜택</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "파일 크기", value: `${limits.maxFileSizeMb}MB` },
              { label: "보관 기간", value: `${limits.storageDays}일` },
              { label: "우선 처리", value: limits.priorityProcessing ? "✓ 제공" : "– 미제공" },
              { label: "팀 공유", value: limits.teamSharing ? "✓ 제공" : "– 미제공" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm font-semibold text-[#1e3a5f]">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">빠른 시작</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href}>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-5 cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBgMap[a.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-[#1e3a5f] text-sm mb-1">{a.label}</p>
                  <p className="text-xs text-gray-500">{a.desc}</p>
                  <div className="mt-3 flex items-center text-orange-500 text-xs font-medium">
                    시작하기 <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Plan + Upgrade */}
      {planId !== "premium" && (
      <Card className="border-0 shadow-sm bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] text-white">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">현재 {planName} 플랜</p>
              <p className="text-blue-200 text-sm mt-0.5">더 많은 AI 기능을 이용하려면 업그레이드하세요</p>
            </div>
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0">
            <Link href="/billing">
              <CreditCard className="h-4 w-4 mr-2" />
              플랜 업그레이드
            </Link>
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Tips */}
      <Card className="border-0 shadow-sm border-l-4 border-l-orange-400 bg-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
            <Zap className="h-4 w-4" /> 오늘의 팁
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700">
            AI 문자 생성 시 <strong>고객 이름</strong>과 <strong>구체적인 상황</strong>을 입력할수록 더 개인화된 메시지가 생성됩니다.
          </p>
        </CardContent>
      </Card>

      {/* Feedback CTA */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-[#1e3a5f]" />
            </div>
            <div>
              <p className="font-semibold text-[#1e3a5f] text-sm">서비스가 더 나아질 수 있도록 도와주세요</p>
              <p className="text-xs text-gray-500 mt-0.5">버그, 기능 제안 등 의견을 자유롭게 보내주세요</p>
            </div>
          </div>
          <Button asChild variant="outline" className="flex-shrink-0 border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5">
            <Link href="/feedback">
              <MessageCircle className="h-4 w-4 mr-2" />
              서비스 개선 의견 보내기
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
