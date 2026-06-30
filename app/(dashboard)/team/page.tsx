import { TeamManager } from "@/components/team/team-manager"

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
        <p className="text-gray-600 mt-1">팀을 만들고 팀원을 연결하여 사용량을 함께 확인할 수 있습니다</p>
      </div>

      <TeamManager />
    </div>
  )
}
