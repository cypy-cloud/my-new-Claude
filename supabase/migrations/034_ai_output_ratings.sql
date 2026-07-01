-- 034_ai_output_ratings.sql
-- AI 결과물 품질 평가 시스템

create table if not exists public.ai_output_ratings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  output_id    uuid,                   -- saved outputs 연결 (optional)
  feature_type text not null,          -- ai_message, ai_script, ai_document, ai_followup 등
  prompt_version text,                 -- 프롬프트 버전 (비교용)
  rating       smallint not null check (rating between 1 and 5),
  is_helpful   boolean,                -- true=도움됐어요, false=아쉬워요, null=미선택
  feedback_text text,
  issue_type   text check (issue_type in (
    'inaccurate', 'awkward', 'too_long', 'too_short',
    'compliance_risk', 'useful', 'other'
  )),
  created_at   timestamptz not null default now()
);

create index if not exists ai_output_ratings_user_id_idx    on public.ai_output_ratings(user_id);
create index if not exists ai_output_ratings_feature_idx    on public.ai_output_ratings(feature_type);
create index if not exists ai_output_ratings_created_at_idx on public.ai_output_ratings(created_at desc);
create index if not exists ai_output_ratings_prompt_ver_idx on public.ai_output_ratings(prompt_version);

alter table public.ai_output_ratings enable row level security;

-- 사용자: 본인 평가만 조회/삽입
create policy "users_manage_own_ratings"
  on public.ai_output_ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 관리자: 모든 평가 조회
create policy "admins_read_all_ratings"
  on public.ai_output_ratings for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
