-- 033_admin_tools.sql
-- 관리자 운영도구 고도화: system_settings + user_restrictions

-- ── system_settings ───────────────────────────────────────────────────────
create table if not exists public.system_settings (
  id           uuid primary key default gen_random_uuid(),
  setting_key  text not null unique,
  setting_value text not null default '',
  description  text,
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now()
);

create index if not exists system_settings_key_idx on public.system_settings(setting_key);

alter table public.system_settings enable row level security;

-- 조회: admin 이상
create policy "admins_read_settings"
  on public.system_settings for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

-- 변경: super_admin만
create policy "superadmin_write_settings"
  on public.system_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- 기본 설정값 삽입
insert into public.system_settings (setting_key, setting_value, description) values
  ('maintenance_mode',     'false',  '점검 모드 활성화 여부 (true/false)'),
  ('signup_enabled',       'true',   '신규 가입 허용 여부 (true/false)'),
  ('ai_enabled',           'true',   'AI 기능 전체 활성화 여부 (true/false)'),
  ('max_pdf_size_mb',      '50',     'PDF 최대 업로드 크기 (MB)'),
  ('free_sms_limit',       '5',      '무료 플랜 AI 문자 월 한도'),
  ('free_script_limit',    '3',      '무료 플랜 AI 스크립트 월 한도'),
  ('free_pdf_limit',       '1',      '무료 플랜 PDF 업로드 월 한도'),
  ('announcement_banner',  '',       '전체 공지 배너 메시지 (비어있으면 미표시)')
on conflict (setting_key) do nothing;

-- ── user_restrictions ────────────────────────────────────────────────────
-- 특정 사용자의 기능 제한
create table if not exists public.user_restrictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null,   -- 'all' | 'ai_message' | 'ai_script' | 'ai_document' | 'ai_followup'
  reason      text,
  restricted_by uuid references auth.users(id) on delete set null,
  expires_at  timestamptz,     -- null = 영구 제한
  created_at  timestamptz not null default now(),
  unique (user_id, feature)
);

create index if not exists user_restrictions_user_id_idx on public.user_restrictions(user_id);

alter table public.user_restrictions enable row level security;

create policy "service_manage_restrictions"
  on public.user_restrictions for all
  using (true) with check (true);
