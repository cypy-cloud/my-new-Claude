-- 035_safety_checks.sql
-- AI 결과물 안전성 검사 테이블

create table if not exists public.safety_checks (
  id               uuid primary key default gen_random_uuid(),
  output_id        uuid,
  feature_type     text not null,
  risk_level       text not null check (risk_level in ('low', 'medium', 'high')),
  detected_issues  jsonb not null default '[]',
  suggested_fixes  jsonb not null default '[]',
  checked_text_len integer,
  created_at       timestamptz not null default now()
);

create index if not exists safety_checks_output_id_idx    on public.safety_checks(output_id);
create index if not exists safety_checks_feature_idx      on public.safety_checks(feature_type);
create index if not exists safety_checks_risk_level_idx   on public.safety_checks(risk_level);
create index if not exists safety_checks_created_at_idx   on public.safety_checks(created_at desc);

alter table public.safety_checks enable row level security;

create policy "admins_read_safety_checks" on public.safety_checks for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  ));

create policy "service_write_safety_checks" on public.safety_checks for insert
  with check (true);
