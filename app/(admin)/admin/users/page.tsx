"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, Filter, MoreHorizontal, AlertCircle } from "lucide-react"

const MOCK_USERS = [
  { id: "1", name: "김보험", email: "kim@example.com", plan: "pro", status: "active", joined: "2025-06-01", usage: 142 },
  { id: "2", name: "이재무", email: "lee@example.com", plan: "team", status: "active", joined: "2025-05-15", usage: 387 },
  { id: "3", name: "박FP", email: "park@example.com", plan: "free", status: "active", joined: "2025-06-28", usage: 3 },
  { id: "4", name: "최설계사", email: "choi@example.com", plan: "pro", status: "active", joined: "2025-04-20", usage: 98 },
  { id: "5", name: "정보험왕", email: "jung@example.com", plan: "team", status: "active", joined: "2025-03-10", usage: 521 },
  { id: "6", name: "한재무사", email: "han@example.com", plan: "free", status: "inactive", joined: "2025-06-10", usage: 0 },
  { id: "7", name: "오보험전문", email: "oh@example.com", plan: "pro", status: "active", joined: "2025-05-01", usage: 67 },
  { id: "8", name: "서금융", email: "seo@example.com", plan: "free", status: "active", joined: "2025-06-25", usage: 5 },
]

const planBadge: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  pro: "bg-[#1e3a5f] text-white",
  team: "bg-orange-500 text-white",
}

const planLabel: Record<string, string> = { free: "무료", pro: "프로", team: "팀" }

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch = u.name.includes(search) || u.email.includes(search)
    const matchPlan = planFilter === "all" || u.plan === planFilter
    return matchSearch && matchPlan
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">사용자 관리</h1>
          <p className="text-gray-500 mt-1">전체 가입 사용자 목록 및 관리</p>
        </div>
        <Badge className="bg-[#1e3a5f] text-white px-3 py-1">{MOCK_USERS.length}명</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="이름 또는 이메일 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "전체" },
            { value: "free", label: "무료" },
            { value: "pro", label: "프로" },
            { value: "team", label: "팀" },
          ].map((f) => (
            <button key={f.value} onClick={() => setPlanFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm border transition-all flex items-center gap-1.5 ${planFilter === f.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/30"}`}>
              <Filter className="h-3.5 w-3.5" />{f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <Users className="h-4 w-4" />사용자 목록 ({filtered.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">사용자</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">플랜</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">이번 달 사용</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">가입일</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`text-xs ${planBadge[user.plan]}`}>{planLabel[user.plan]}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.status === "active" ? "text-green-700" : "text-gray-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-gray-300"}`} />
                        {user.status === "active" ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.usage}회</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{user.joined}</td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>현재 목록은 목업 데이터입니다. Phase 5에서 실제 Supabase 사용자 데이터와 연동됩니다.</span>
      </div>
    </div>
  )
}
