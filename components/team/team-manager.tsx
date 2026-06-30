"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, UserPlus, Crown, Shield, User, Mail, Clock, BarChart3 } from "lucide-react"
import { TEAM_ROLE_LABELS, type Team, type TeamMember, type TeamInvite, type TeamRole } from "@/lib/team/types"

const ROLE_ICON: Record<TeamRole, React.ElementType> = { owner: Crown, manager: Shield, member: User }

interface UsageSummary {
  month: string
  members: { userId: string; name: string | null; email: string; role: string; smsCount: number; scriptCount: number; followupCount: number; pdfUploadCount: number; pdfAnalysisCount: number; costEstimate: number }[]
  totals: { smsCount: number; scriptCount: number; followupCount: number; pdfUploadCount: number; pdfAnalysisCount: number; costEstimate: number }
}

export function TeamManager() {
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [myRole, setMyRole] = useState<TeamRole | null>(null)
  const [memberCount, setMemberCount] = useState(0)

  const isTeamAdmin = myRole === "owner" || myRole === "manager"

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/teams")
    const data = await res.json()
    setTeam(data.team)
    setMyRole(data.myRole)
    setMemberCount(data.memberCount ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  }

  if (!team) {
    return <CreateTeamCard onCreated={load} />
  }

  return (
    <div className="space-y-6">
      <TeamSummaryCard team={team} myRole={myRole!} memberCount={memberCount} />
      <TeamMembersCard isTeamAdmin={isTeamAdmin} onChanged={load} />
      {isTeamAdmin && <TeamUsageCard />}
    </div>
  )
}

function CreateTeamCard({ onCreated }: { onCreated: () => void }) {
  const [teamName, setTeamName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!teamName.trim()) {
      toast.error("팀 이름을 입력해주세요")
      return
    }
    setSaving(true)
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, organizationName }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "팀 생성 실패")
      setSaving(false)
      return
    }
    toast.success("팀이 생성되었습니다")
    setSaving(false)
    onCreated()
  }

  return (
    <Card className="border-0 shadow-sm max-w-xl">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#1e3a5f]" />
          <h2 className="text-base font-bold text-[#1e3a5f]">아직 소속된 팀이 없습니다</h2>
        </div>
        <p className="text-sm text-gray-500">
          팀을 만들면 팀원을 초대하고, 팀 전체 사용량을 확인할 수 있습니다. 팀을 만든 사람은 자동으로 &lsquo;팀 소유자&rsquo;가 됩니다.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">팀 이름 (필수)</label>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="예: 강남지점 1팀"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">소속 조직명 (선택)</label>
            <input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="예: OO보험 강남지점"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <Button disabled={saving} onClick={handleCreate} className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Building2 className="h-3.5 w-3.5 mr-1.5" />}
          팀 만들기
        </Button>
      </CardContent>
    </Card>
  )
}

function TeamSummaryCard({ team, myRole, memberCount }: { team: Team; myRole: TeamRole; memberCount: number }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{team.team_name}</h2>
          {team.organization_name && <p className="text-sm text-gray-500">{team.organization_name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">팀원 {memberCount}명</Badge>
          <Badge className="text-xs bg-[#1e3a5f] text-white">내 역할: {TEAM_ROLE_LABELS[myRole]}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamMembersCard({ isTeamAdmin, onChanged }: { isTeamAdmin: boolean; onChanged: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"manager" | "member">("member")
  const [connecting, setConnecting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [membersRes, invitesRes] = await Promise.all([
      fetch("/api/teams/members"),
      isTeamAdmin ? fetch("/api/teams/invites") : Promise.resolve(null),
    ])
    const membersData = await membersRes.json()
    setMembers(membersData.members ?? [])
    if (invitesRes) {
      const invitesData = await invitesRes.json()
      setInvites(invitesData.invites ?? [])
    }
    setLoading(false)
  }, [isTeamAdmin])

  useEffect(() => { load() }, [load])

  async function handleConnect() {
    if (!email.trim()) {
      toast.error("이메일을 입력해주세요")
      return
    }
    setConnecting(true)
    const res = await fetch("/api/teams/members/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "연결 실패")
      setConnecting(false)
      return
    }
    if (data.connected) {
      toast.success("팀원이 연결되었습니다")
    } else {
      toast.info("아직 가입하지 않은 이메일입니다. 가입 후 다시 연결해주세요 (초대 대기 등록됨)")
    }
    setEmail("")
    setConnecting(false)
    load()
    onChanged()
  }

  async function handleRoleChange(id: string, newRole: "manager" | "member") {
    const res = await fetch(`/api/teams/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "변경 실패")
      return
    }
    toast.success("역할이 변경되었습니다")
    load()
  }

  async function handleRemove(id: string) {
    if (!confirm("이 팀원을 팀에서 제거하시겠습니까?")) return
    const res = await fetch(`/api/teams/members/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "제거 실패")
      return
    }
    toast.success("팀원이 제거되었습니다")
    load()
    onChanged()
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> 팀원 목록 ({members.length}명)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTeamAdmin && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-gray-500">팀원 수동 연결 (이메일 초대는 준비 중입니다 — 가입된 이메일을 입력하면 즉시 연결됩니다)</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="가입된 사용자의 이메일"
                className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "manager" | "member")}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="member">팀원</option>
                <option value="manager">팀 관리자</option>
              </select>
              <Button size="sm" disabled={connecting} onClick={handleConnect} className="bg-orange-500 hover:bg-orange-600 text-white">
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                연결
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="divide-y">
            {members.map((m) => {
              const Icon = ROLE_ICON[m.role]
              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.name || "(이름 없음)"}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">{TEAM_ROLE_LABELS[m.role]}</Badge>
                  </div>
                  {isTeamAdmin && m.role !== "owner" && (
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as "manager" | "member")}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="member">팀원</option>
                        <option value="manager">팀 관리자</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={() => handleRemove(m.id)} className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7 px-2">
                        제거
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {isTeamAdmin && invites.filter((i) => i.status === "pending").length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 연결 대기 중 (미가입 이메일)</p>
            <div className="space-y-1.5">
              {invites.filter((i) => i.status === "pending").map((i) => (
                <div key={i.id} className="text-xs bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span>{i.email}</span>
                  <Badge variant="outline" className="text-xs">{TEAM_ROLE_LABELS[i.role]}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TeamUsageCard() {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teams/usage").then((r) => r.json()).then((data) => { setUsage(data); setLoading(false) })
  }, [])

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> 팀 사용량 {usage ? `(${usage.month})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : !usage || usage.members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">사용량 데이터가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-2 pr-4">멤버</th>
                  <th className="py-2 pr-4">문자/카톡</th>
                  <th className="py-2 pr-4">스크립트</th>
                  <th className="py-2 pr-4">후속연락</th>
                  <th className="py-2 pr-4">PDF업로드</th>
                  <th className="py-2 pr-4">PDF분석</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usage.members.map((m) => (
                  <tr key={m.userId}>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-700">{m.name || "(이름 없음)"}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </td>
                    <td className="py-2 pr-4">{m.smsCount}</td>
                    <td className="py-2 pr-4">{m.scriptCount}</td>
                    <td className="py-2 pr-4">{m.followupCount}</td>
                    <td className="py-2 pr-4">{m.pdfUploadCount}</td>
                    <td className="py-2 pr-4">{m.pdfAnalysisCount}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-[#1e3a5f]">
                  <td className="py-2 pr-4">합계</td>
                  <td className="py-2 pr-4">{usage.totals.smsCount}</td>
                  <td className="py-2 pr-4">{usage.totals.scriptCount}</td>
                  <td className="py-2 pr-4">{usage.totals.followupCount}</td>
                  <td className="py-2 pr-4">{usage.totals.pdfUploadCount}</td>
                  <td className="py-2 pr-4">{usage.totals.pdfAnalysisCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
