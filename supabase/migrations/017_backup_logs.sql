-- 백업 작업 이력 기록: 사용자별 ZIP 백업, 관리자 CSV 내보내기, 시스템(cron) 백업 모두 기록
create table if not exists public.backup_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  backup_type text not null check (backup_type in ('user_zip', 'admin_csv', 'system')),
  status      text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  file_path   text,
  created_at  timestamptz not null default now()
);

create index if not exists backup_logs_user_id_idx     on public.backup_logs(user_id);
create index if not exists backup_logs_type_idx        on public.backup_logs(backup_type);
create index if not exists backup_logs_created_at_idx  on public.backup_logs(created_at desc);

alter table public.backup_logs enable row level security;

-- 사용자는 자신의 백업 이력만 조회
create policy "users_read_own_backup_logs"
  on public.backup_logs for select
  using (auth.uid() = user_id);

-- 관리자는 전체 백업 이력 조회
create policy "admins_read_all_backup_logs"
  on public.backup_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- 서버(service role)에서만 insert
create policy "service_insert_backup_logs"
  on public.backup_logs for insert
  with check (true);
