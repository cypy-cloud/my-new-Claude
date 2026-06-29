import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, BookOpen, FileText, ArrowRight, TrendingUp, Zap, CreditCard } from "lucide-react"
import { PLAN_LABELS } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const yearMonth = new Date().toISOString().slice(0, 7)

  const [{ data: profileData }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("name, email, plan_type").eq("user_id", user!.id).single(),
    supabase.from("monthly_usage").select("ai_message_count, ai_script_count, ai_document_count").eq("user_id", user!.id).eq("year_month", yearMonth).maybeSingle(),
  ])

  const planType = profileData?.plan_type ?? 'free'
  const { data: plan } = await supabase
    .from("plans")
    .select("name, ai_message_limit, ai_script_limit, ai_document_limit")
    .eq("id", planType)
    .single()

  const p = plan as { name?: string; ai_message_limit?: number; ai_script_limit?: number; ai_document_limit?: number } | null
  const u = usage as { ai_message_count?: number; ai_script_count?: number; ai_document_count?: number } | null

  const stats = [
    { label: "AI 문자/카톡", used: u?.ai_message_count ?? 0, limit: p?.ai_message_limit ?? 5, icon: MessageSquare, color: "blue", href: "/ai-message" },
    { label: "AI 상담 스크립트", used: u?.ai_script_count ?? 0, limit: p?.ai_script_limit ?? 3, icon: BookOpen, color: "purple", href: "/ai-script" },
    { label: "AI PDF 분석", used: u?.ai_document_count ?? 0, limit: p?.ai_document_limit ?? 1, icon: FileText, color: "orange", href: "/ai-document" },
  ]

  const colorMap: Record<string, string> = { blue: "bg-blue-500", purple: "bg-purple-500", orange: "bg-orange-500" }
  const iconBgMap: Record<string, string> = { blue: "bg-blue-100 text-blue-600", purple: "bg-purple-100 text-purple-600", orange: "bg-orange-100 text-orange-500" }

  const quickActions = [
    { href: "/ai-message", label: "AI 문자 생성", desc: "고객 메시지 자동 작성", icon: MessageSquare, color: "blue" },
    { href: "/ai-script", label: "AI 스크립트", desc: "맞춤형 상담 스크립트", icon: BookOpen, color: "purple" },
    { href: "/ai-document", label: "AI PDF 분석", desc: "PDF 설명자료 자동화", icon: FileText, color: "orange" },
  ]

  const planLabel = PLAN_LABELS[planType as keyof typeof PLAN_LABELS] ?? "무료"

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            안녕하세요, {profileData?.name ?? "설계사"}님! 👋
          </h1>
          <p className="text-gray-500 mt-1">오늘도 FP AI Assistant와 함께 효율적인 업무를 시작해보세요.</p>
        </div>
        <Badge className="self-start sm:self-auto bg-[#1e3a5f] text-white px-4 py-1.5 text-sm">
          {planLabel} 플랜
        </Badge>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">이번 달 사용량 ({yearMonth})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            const pct = s.limit > 0 ? Math.min(100, (s.used / s.limit) * 100) : 0
            return (
              <Link key={s.label} href={s.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBgMap[s.color]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-2xl font-bold text-[#1e3a5f]">
                        {s.used}<span className="text-sm font-normal text-gray-400">/{s.limit}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{s.label}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${colorMap[s.color]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

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

      <Card className="border-0 shadow-sm bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] text-white">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">현재 {planLabel} 플랜</p>
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
    </div>
  )
}
