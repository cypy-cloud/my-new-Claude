-- announcements 테이블 컬럼 확장 (001에서 생성된 기존 테이블에 추가)
alter table public.announcements
  add column if not exists target_role  text not null default 'all'
    check (target_role in ('all', 'user', 'manager', 'admin')),
  add column if not exists is_pinned    boolean not null default false,
  add column if not exists is_active    boolean not null default true,
  add column if not exists starts_at    timestamptz,
  add column if not exists ends_at      timestamptz,
  add column if not exists updated_at   timestamptz not null default now();

-- target_plan 컬럼: 기존 제약 조건 재정의
-- (기존 check 없으면 무시됨)
alter table public.announcements
  drop constraint if exists announcements_target_plan_check;

alter table public.announcements
  add constraint announcements_target_plan_check
    check (target_plan in ('all', 'free', 'basic', 'pro', 'premium') or target_plan is null);

-- 기본값 설정
update public.announcements set target_plan = 'all' where target_plan is null;
alter table public.announcements alter column target_plan set default 'all';
alter table public.announcements alter column target_plan set not null;

-- announcement_reads: 읽음 처리
create table if not exists public.announcement_reads (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  unique(announcement_id, user_id)
);

create index if not exists announcement_reads_user_idx on public.announcement_reads(user_id);
create index if not exists announcement_reads_ann_idx  on public.announcement_reads(announcement_id);

alter table public.announcement_reads enable row level security;

create policy "users_manage_own_reads"
  on public.announcement_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins_read_all_reads"
  on public.announcement_reads for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- 인덱스
create index if not exists announcements_is_active_idx  on public.announcements(is_active);
create index if not exists announcements_is_pinned_idx  on public.announcements(is_pinned);
create index if not exists announcements_starts_at_idx  on public.announcements(starts_at);
create index if not exists announcements_target_plan_idx on public.announcements(target_plan);
