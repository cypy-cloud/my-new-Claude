-- 버전 업데이트 전략: 버전 등록/공지 기능

create table if not exists public.app_versions (
  id           uuid primary key default gen_random_uuid(),
  version      text not null unique,
  title        text not null,
  description  text,
  changes      jsonb not null default '[]',
  release_date date not null default current_date,
  is_current   boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists app_versions_release_date_idx on public.app_versions(release_date desc);
create index if not exists app_versions_is_current_idx   on public.app_versions(is_current);

alter table public.app_versions enable row level security;

create policy "anyone_read_versions"
  on public.app_versions for select
  using (true);

create policy "admins_manage_versions"
  on public.app_versions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

create table if not exists public.app_version_reads (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.app_versions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  read_at     timestamptz not null default now(),
  unique(version_id, user_id)
);

create index if not exists app_version_reads_user_idx    on public.app_version_reads(user_id);
create index if not exists app_version_reads_version_idx on public.app_version_reads(version_id);

alter table public.app_version_reads enable row level security;

create policy "users_manage_own_version_reads"
  on public.app_version_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins_read_all_version_reads"
  on public.app_version_reads for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
