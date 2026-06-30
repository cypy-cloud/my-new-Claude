export type TeamRole = 'owner' | 'manager' | 'member'

export interface Team {
  id: string
  team_name: string
  organization_name: string | null
  owner_user_id: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
  name: string | null
  email: string
}

export interface TeamInvite {
  id: string
  team_id: string
  email: string
  role: 'manager' | 'member'
  status: 'pending' | 'connected' | 'cancelled'
  created_at: string
  connected_at: string | null
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: '팀 소유자',
  manager: '팀 관리자',
  member: '팀원',
}
