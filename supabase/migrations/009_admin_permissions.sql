-- admin_permissions: 역할별 권한 키 테이블
create table if not exists public.admin_permissions (
  id          uuid primary key default gen_random_uuid(),
  role        text not null check (role in ('user', 'manager', 'admin', 'super_admin')),
  permission_key text not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(role, permission_key)
);

create index if not exists admin_permissions_role_idx on public.admin_permissions(role);

alter table public.admin_permissions enable row level security;

-- 읽기: 인증된 사용자 (서버에서 권한 확인용)
create policy "authenticated_read_permissions"
  on public.admin_permissions for select
  using (auth.role() = 'authenticated');

-- 쓰기: service role만
create policy "service_manage_permissions"
  on public.admin_permissions for all
  using (true) with check (true);

-- 기본 권한 시드 데이터
insert into public.admin_permissions (role, permission_key, enabled) values
  -- manager
  ('manager', 'team.view_members',        true),
  ('manager', 'team.view_usage',          true),
  -- admin (manager 권한 포함)
  ('admin',   'team.view_members',        true),
  ('admin',   'team.view_usage',          true),
  ('admin',   'users.list',               true),
  ('admin',   'users.view',               true),
  ('admin',   'users.change_plan',        true),
  ('admin',   'usage.view_stats',         true),
  ('admin',   'notice.write',             true),
  ('admin',   'feedback.view',            true),
  ('admin',   'logs.view_errors',         true),
  -- super_admin (모든 권한)
  ('super_admin', 'team.view_members',    true),
  ('super_admin', 'team.view_usage',      true),
  ('super_admin', 'users.list',           true),
  ('super_admin', 'users.view',           true),
  ('super_admin', 'users.change_plan',    true),
  ('super_admin', 'users.change_role',    true),
  ('super_admin', 'usage.view_stats',     true),
  ('super_admin', 'notice.write',         true),
  ('super_admin', 'feedback.view',        true),
  ('super_admin', 'logs.view_errors',     true),
  ('super_admin', 'logs.view_all',        true),
  ('super_admin', 'system.settings',      true),
  ('super_admin', 'ai.prompt_manage',     true)
on conflict (role, permission_key) do nothing;
