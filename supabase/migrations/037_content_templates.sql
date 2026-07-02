-- 037_content_templates.sql
-- 보험사별/상황별 템플릿 구조

create table if not exists public.content_templates (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  category        text not null, -- 'greeting', 'follow_up', 'claim', 'renewal', 'new_contract', 'general'
  feature_type    text not null check (feature_type in ('ai_message', 'ai_script', 'ai_document')),
  insurance_company_id uuid references public.insurance_companies(id) on delete set null,
  template_content text not null,
  variables       jsonb default '[]'::jsonb, -- [{"key":"name","label":"고객명","required":true}]
  tags            text[] default '{}',
  is_public       boolean not null default true,
  is_premium      boolean not null default false,
  is_active       boolean not null default true,
  sort_order      integer default 0,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.template_usage_logs (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.content_templates(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature_type text not null,
  used_at     timestamptz not null default now()
);

-- 인덱스
create index if not exists content_templates_feature_type_idx on public.content_templates(feature_type);
create index if not exists content_templates_category_idx on public.content_templates(category);
create index if not exists content_templates_insurance_idx on public.content_templates(insurance_company_id);
create index if not exists content_templates_is_public_idx on public.content_templates(is_public, is_active);
create index if not exists template_usage_logs_template_id_idx on public.template_usage_logs(template_id);
create index if not exists template_usage_logs_user_id_idx on public.template_usage_logs(user_id);

-- updated_at 자동 갱신
create or replace function update_content_templates_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger content_templates_updated_at
  before update on public.content_templates
  for each row execute function update_content_templates_updated_at();

-- RLS
alter table public.content_templates enable row level security;
alter table public.template_usage_logs enable row level security;

-- 공개 템플릿: 로그인 사용자 누구나 조회
create policy "users_view_public_templates"
  on public.content_templates for select
  using (auth.uid() is not null and is_public = true and is_active = true);

-- 관리자: 전체 조회/수정/삭제
create policy "admin_manage_templates"
  on public.content_templates for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- 사용 로그: 본인 것만 insert/select
create policy "users_log_template_usage"
  on public.template_usage_logs for insert
  with check (auth.uid() = user_id);

create policy "users_view_own_usage_logs"
  on public.template_usage_logs for select
  using (auth.uid() = user_id);

create policy "admin_view_all_usage_logs"
  on public.template_usage_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- 기본 샘플 템플릿 (카테고리별)
insert into public.content_templates
  (title, description, category, feature_type, template_content, variables, tags, is_public, is_premium, sort_order)
values
  (
    '신규 계약 감사 문자',
    '계약 체결 후 감사 인사 문자 템플릿',
    'new_contract',
    'ai_message',
    '안녕하세요 {{name}}님, 저는 {{agent_name}} FP입니다.\n\n이번에 {{product_name}} 가입해 주셔서 진심으로 감사드립니다. 😊\n\n가입하신 보험에 대해 궁금하신 점이 있으시면 언제든지 연락 주세요.\n앞으로도 든든한 보험 파트너가 되겠습니다!\n\n감사합니다.',
    '[{"key":"name","label":"고객명","required":true},{"key":"agent_name","label":"담당 FP 이름","required":true},{"key":"product_name","label":"상품명","required":true}]',
    '{"신규계약","감사인사","문자"}',
    true, false, 1
  ),
  (
    '갱신 안내 문자',
    '보험 갱신 시기 알림 문자 템플릿',
    'renewal',
    'ai_message',
    '안녕하세요 {{name}}님! 😊\n\n가입하신 {{product_name}}의 갱신일이 {{renewal_date}}로 다가왔습니다.\n\n갱신 관련하여 궁금한 점이나 변경을 원하시는 사항이 있으시면 편하게 연락 주세요.\n\n항상 최선을 다해 도와드리겠습니다!',
    '[{"key":"name","label":"고객명","required":true},{"key":"product_name","label":"상품명","required":true},{"key":"renewal_date","label":"갱신일","required":true}]',
    '{"갱신","안내","문자"}',
    true, false, 2
  ),
  (
    '보험금 청구 안내 문자',
    '보험금 청구 절차 안내 문자 템플릿',
    'claim',
    'ai_message',
    '안녕하세요 {{name}}님,\n\n보험금 청구 안내 드립니다.\n\n📋 필요 서류\n- 청구서 (앱/팩스 가능)\n- 진단서 또는 진료확인서\n- 입퇴원확인서 (입원 시)\n- 통장사본\n\n서류 준비 어려우시면 말씀해 주세요. 도움 드리겠습니다!',
    '[{"key":"name","label":"고객명","required":true}]',
    '{"청구","안내","서류"}',
    true, false, 3
  ),
  (
    '생신 축하 문자',
    '고객 생일 축하 문자 템플릿',
    'follow_up',
    'ai_message',
    '{{name}}님, 생신을 진심으로 축하드립니다! 🎂🎉\n\n건강하고 행복한 한 해 되시길 바랍니다.\n항상 건강하게 오래오래 곁에 계셔 주세요 😊\n\n감사합니다, {{agent_name}} FP 드림',
    '[{"key":"name","label":"고객명","required":true},{"key":"agent_name","label":"담당 FP 이름","required":true}]',
    '{"생일","축하","팔로업"}',
    true, false, 4
  ),
  (
    '종신보험 상담 스크립트',
    '종신보험 첫 상담 시 활용 가능한 스크립트',
    'general',
    'ai_script',
    '# 종신보험 초회 상담 스크립트\n\n## 오프닝\n"안녕하세요 {{name}}님, 오늘 시간 내주셔서 감사합니다. 오늘은 {{name}}님 가족의 미래를 위한 종신보험에 대해 말씀드리겠습니다."\n\n## 니즈 파악\n"혹시 현재 가족 보장 관련해서 걱정되시는 부분이 있으신가요?"\n"자녀 교육비나 가족 생활비 보장은 어떻게 준비하고 계신가요?"\n\n## 상품 설명\n종신보험은 피보험자가 사망하거나 고도장해 시 보험금이 지급됩니다.\n- 사망보험금으로 가족 생활비 보장\n- 연금 전환 가능으로 노후 대비\n- 세금 혜택 (보험료 소득공제)\n\n## 클로징\n"{{name}}님 상황에 맞는 최적의 플랜을 제안드릴게요. 월 보험료 {{premium}}원으로 {{coverage}}억 원 보장이 가능합니다."',
    '[{"key":"name","label":"고객명","required":true},{"key":"premium","label":"월보험료","required":false},{"key":"coverage","label":"보장금액(억)","required":false}]',
    '{"종신보험","스크립트","초회상담"}',
    true, false, 1
  ),
  (
    '실손보험 상담 스크립트',
    '실손의료보험 상담 스크립트',
    'general',
    'ai_script',
    '# 실손의료보험 상담 스크립트\n\n## 오프닝\n"{{name}}님, 최근 의료비가 많이 걱정되시죠? 오늘은 실손의료보험에 대해 쉽게 설명드리겠습니다."\n\n## 핵심 설명\n실손보험은 실제 지출한 의료비를 돌려받는 보험입니다.\n- 입원, 통원, 약제비 모두 보장\n- 자기부담금: 통원 1만원 / 입원 20%\n- 비급여 항목도 일부 보장\n\n## 주의사항\n"기존 실손 가입 여부 꼭 확인해 주세요. 중복 가입 시 보장이 겹칩니다."\n\n## 추천\n"{{name}}님처럼 {{age}}대에는 {{plan_name}} 플랜이 가장 적합합니다."',
    '[{"key":"name","label":"고객명","required":true},{"key":"age","label":"연령대","required":false},{"key":"plan_name","label":"추천 플랜명","required":false}]',
    '{"실손보험","의료비","스크립트"}',
    true, false, 2
  ),
  (
    '연금보험 상담 스크립트 (프리미엄)',
    '연금보험 심화 상담 스크립트 - 프리미엄 전용',
    'general',
    'ai_script',
    '# 연금보험 심화 상담 스크립트\n\n## 노후 자산 분석\n"{{name}}님, 은퇴 후 필요한 월 생활비를 계산해 보겠습니다."\n- 현재 월 지출: {{monthly_expense}}만원\n- 예상 은퇴 나이: {{retire_age}}세\n- 필요 노후 기간: {{retire_years}}년\n\n## 연금 갭 분석\n"국민연금 예상 수령액과 실제 필요 금액의 차이를 채워드리겠습니다."\n\n## 상품 비교\n| 구분 | 변액연금 | 즉시연금 | 연금저축 |\n|------|---------|---------|--------|\n| 수익성 | 높음 | 중간 | 중간 |\n| 안전성 | 중간 | 높음 | 높음 |\n| 세제혜택 | 없음 | 없음 | 있음 |\n\n## 맞춤 제안\n"{{name}}님의 경우 {{recommended_product}}가 가장 적합합니다. 월 {{premium}}만원으로 {{retire_age}}세부터 월 {{pension_amount}}만원 수령 가능합니다."',
    '[{"key":"name","label":"고객명","required":true},{"key":"monthly_expense","label":"월 지출(만원)","required":false},{"key":"retire_age","label":"은퇴 나이","required":false},{"key":"retire_years","label":"노후 기간(년)","required":false},{"key":"recommended_product","label":"추천 상품","required":false},{"key":"premium","label":"월 보험료(만원)","required":false},{"key":"pension_amount","label":"월 연금액(만원)","required":false}]',
    '{"연금보험","노후","프리미엄","심화"}',
    true, true, 3
  );
