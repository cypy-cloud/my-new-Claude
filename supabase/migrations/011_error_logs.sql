create table if not exists public.error_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  area         text not null default 'unknown'
               check (area in ('auth', 'ai', 'upload', 'payment', 'admin', 'database', 'unknown')),
  error_message text not null,
  stack_trace  text,
  metadata     jsonb,
  severity     text not null default 'medium'
               check (severity in ('low', 'medium', 'high', 'critical')),
  resolved     boolean not null default false,
  resolved_by  uuid references auth.users(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists error_logs_user_id_idx    on public.error_logs(user_id);
create index if not exists error_logs_area_idx       on public.error_logs(area);
create index if not exists error_logs_severity_idx   on public.error_logs(severity);
create index if not exists error_logs_resolved_idx   on public.error_logs(resolved);
create index if not exists error_logs_created_at_idx on public.error_logs(created_at desc);

alter table public.error_logs enable row level security;

-- 사용자는 자신의 에러만 조회 (resolved 처리는 불가)
create policy "users_read_own_errors"
  on public.error_logs for select
  using (auth.uid() = user_id);

-- 관리자는 전체 조회 가능
create policy "admins_read_all_errors"
  on public.error_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- 관리자는 resolved 업데이트 가능
create policy "admins_update_errors"
  on public.error_logs for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- 서버(service role)에서만 insert
create policy "service_insert_errors"
  on public.error_logs for insert
  with check (true);
