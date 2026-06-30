-- AI prompt version management: rework `prompt_versions` (declared in 001_initial_schema.sql
-- with a `feature`/`prompt_template` shape that was never wired to an admin UI) into the
-- feature_type/title/system_prompt/user_prompt_template model with full version history.

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  feature_type text not null,
  version text not null,
  title text,
  system_prompt text,
  user_prompt_template text not null default '',
  is_active boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate legacy column names if this table was previously created with the 001 shape
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prompt_versions' and column_name = 'feature'
  ) then
    alter table public.prompt_versions rename column feature to feature_type;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prompt_versions' and column_name = 'prompt_template'
  ) then
    alter table public.prompt_versions rename column prompt_template to user_prompt_template;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prompt_versions' and column_name = 'description'
  ) then
    alter table public.prompt_versions drop column description;
  end if;
end $$;

alter table public.prompt_versions add column if not exists title text;
alter table public.prompt_versions add column if not exists system_prompt text;
alter table public.prompt_versions add column if not exists updated_at timestamptz not null default now();
alter table public.prompt_versions alter column user_prompt_template set not null;

-- Drop legacy constraints (named after the old column names) before re-adding under new names
alter table public.prompt_versions drop constraint if exists prompt_versions_feature_check;
alter table public.prompt_versions drop constraint if exists prompt_versions_feature_version_key;

alter table public.prompt_versions drop constraint if exists prompt_versions_feature_type_check;
alter table public.prompt_versions add constraint prompt_versions_feature_type_check
  check (feature_type in ('sms', 'script', 'pdf_explanation'));

alter table public.prompt_versions drop constraint if exists prompt_versions_feature_type_version_key;
alter table public.prompt_versions add constraint prompt_versions_feature_type_version_key
  unique (feature_type, version);

create index if not exists idx_prompt_versions_active on public.prompt_versions(feature_type, is_active);

drop trigger if exists prompt_versions_updated_at on public.prompt_versions;
create trigger prompt_versions_updated_at before update on public.prompt_versions
  for each row execute function public.set_updated_at();

alter table public.prompt_versions enable row level security;

drop policy if exists "Authenticated users can read active prompts" on public.prompt_versions;
create policy "Authenticated users can read active prompts" on public.prompt_versions
  for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage prompts" on public.prompt_versions;
drop policy if exists "Super admins can manage prompts" on public.prompt_versions;
create policy "Super admins can manage prompts" on public.prompt_versions
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Seed initial active versions matching the code fallback prompts, if none exist yet
insert into public.prompt_versions (feature_type, version, title, system_prompt, user_prompt_template, is_active)
select 'sms', 'v2.0.0', '기본 문자/카톡 생성 프롬프트',
  '당신은 보험설계사를 돕는 전문 메시지 작성 AI입니다.',
  '고객 정보:\n- 이름: {{customer_name}}\n- 연령대: {{age_group}}\n- 직업: {{occupation}}\n- 관계: {{relationship}}\n- 목적: {{purpose}}\n- 상품 분야: {{product_field}}\n- 선호 말투: {{tone}}\n- 메시지 길이: {{length}}\n- 추가 참고 내용: {{extra_notes}}\n\n아래 5가지 버전의 메시지를 작성해주세요. 각 버전은 [SMS] [KAKAO] [SOFT] [PERSUASIVE] [FOLLOWUP] 마커로 구분하세요.',
  true
where not exists (select 1 from public.prompt_versions where feature_type = 'sms');

insert into public.prompt_versions (feature_type, version, title, system_prompt, user_prompt_template, is_active)
select 'script', 'v2.0.0', '기본 상담 스크립트 생성 프롬프트',
  '당신은 10년 이상 경력의 보험 상담 전문가입니다.',
  '고객 정보:\n- 이름: {{customer_name}}\n- 성별: {{gender}}\n- 연령대: {{age_group}}\n- 직업: {{occupation}}\n- 관심 상품: {{product_interest}}\n- 상담 목적: {{consultation_purpose}}\n\n아래 섹션을 마커로 구분하여 작성하세요: [PREP] [GREETING] [ICEBREAK] [NEEDS] [AWARENESS] [PRODUCT] [PERSONA] [OBJECTION] [CLOSING] [FOLLOWUP]',
  true
where not exists (select 1 from public.prompt_versions where feature_type = 'script');

insert into public.prompt_versions (feature_type, version, title, system_prompt, user_prompt_template, is_active)
select 'pdf_explanation', 'v2.0.0', '기본 PDF 설명자료 생성 프롬프트',
  '당신은 보험 약관을 고객에게 쉽게 설명하는 전문 설계사입니다.',
  '[PDF 추출 텍스트]\n{{pdf_content}}\n\n[고객 정보]\n- 연령대: {{age_group}}\n- 설명 난이도: {{difficulty_level}}\n\n아래 섹션을 마커로 구분하여 작성하세요: [SUMMARY] [COVERAGE] [MISCONCEPTIONS] [CHECKLIST] [EXCLUSIONS] [QNA] [AGENT_SCRIPT] [CAUTION]',
  true
where not exists (select 1 from public.prompt_versions where feature_type = 'pdf_explanation');
