-- Migration 031: 팀 공유 자료함 (team_files)
--
-- 팀 관리자/소유자가 공통 자료(PDF)를 업로드하면
-- 팀원들이 해당 자료 기반으로 AI 설명자료를 생성할 수 있다.
-- 스토리지 경로: teams/{team_id}/{file_id}/{filename}  (개인 파일: {user_id}/... 와 명확히 구분)
-- RLS: is_team_member / is_team_admin SECURITY DEFINER 함수 활용 (030에서 정의)

create table if not exists public.team_files (
  id                 uuid        primary key default gen_random_uuid(),
  team_id            uuid        not null references public.teams(id) on delete cascade,
  uploaded_by        uuid        not null references auth.users(id) on delete cascade,
  original_file_name text        not null,
  storage_path       text,
  extracted_text     text,
  summary_text       text,
  status             text        not null default 'processing'
                     check (status in ('processing', 'completed', 'failed', 'deleted', 'original_expired')),
  visibility         text        not null default 'team'
                     check (visibility in ('team', 'managers_only')),
  delete_after       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.team_files enable row level security;

-- Indexes
create index if not exists idx_team_files_team_id      on public.team_files(team_id);
create index if not exists idx_team_files_uploaded_by  on public.team_files(uploaded_by);
create index if not exists idx_team_files_delete_after on public.team_files(delete_after)
  where status not in ('deleted', 'original_expired');

-- Updated-at trigger
drop trigger if exists team_files_updated_at on public.team_files;
create trigger team_files_updated_at
  before update on public.team_files
  for each row execute function public.set_updated_at();

-- RLS: SELECT — 팀원은 'team' 공개 파일, 관리자/소유자는 'managers_only' 포함 전체
drop policy if exists "Team members can view team files"   on public.team_files;
drop policy if exists "Team admins can manage team files"  on public.team_files;

create policy "Team members can view team files" on public.team_files
  for select using (
    status != 'deleted'
    and (
      (visibility = 'team'           and public.is_team_member(team_id))
      or (visibility = 'managers_only' and public.is_team_admin(team_id))
    )
  );

-- RLS: INSERT/UPDATE/DELETE — 관리자/소유자만
create policy "Team admins can manage team files" on public.team_files
  for all using   (public.is_team_admin(team_id))
  with check      (public.is_team_admin(team_id));
