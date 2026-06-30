-- Insurance product category management: lets AI generation features be tied to a
-- structured product category (with optional sub-category via parent_id), each
-- carrying its own risk_notice that gets appended to AI output disclaimers, and
-- paving the way for future per-category prompt templates.

create table if not exists public.product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  parent_id uuid references public.product_categories(id) on delete set null,
  description text,
  risk_notice text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_categories_parent on public.product_categories(parent_id);

alter table public.product_categories enable row level security;

drop policy if exists "Authenticated users can read active categories" on public.product_categories;
create policy "Authenticated users can read active categories" on public.product_categories
  for select using (auth.role() = 'authenticated');

drop policy if exists "Super admins can manage categories" on public.product_categories;
create policy "Super admins can manage categories" on public.product_categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- Seed default categories (idempotent)
insert into public.product_categories (name, description, risk_notice)
values
  ('암보험', '암 진단/치료 보장 보험', '암 진단 확정 시점, 보장 제외 암종, 면책기간(가입 후 90일 등)을 반드시 확인하세요.'),
  ('종신보험', '평생 사망 보장 보험', '해지환급금이 납입보험료보다 적을 수 있으며, 사업비 공제 구조를 반드시 안내하세요.'),
  ('정기보험', '일정 기간 사망 보장 보험', '보장 기간 만료 후 재가입 시 보험료가 인상될 수 있음을 안내하세요.'),
  ('실손보험', '실제 부담 의료비 보장 보험', '자기부담금, 보장 제외 항목(비급여 일부 등), 갱신형 보험료 변동 가능성을 안내하세요.'),
  ('운전자보험', '교통사고 법률비용 등 보장 보험', '형사합의금/벌금 보장 한도와 면책 사유(음주운전 등)를 반드시 확인하세요.'),
  ('화재보험', '화재로 인한 재산 피해 보장 보험', '보장 대상 재산 범위와 화재 외 손해(누수 등) 보장 여부를 확인하세요.'),
  ('치아보험', '치과 치료비 보장 보험', '면책기간 및 감액기간 중 발생한 치료는 보장이 제한될 수 있습니다.'),
  ('연금보험', '노후 생활자금 마련 보험', '중도 해지 시 원금 손실 가능성과 연금 개시 시점 조건을 안내하세요.'),
  ('저축보험', '목돈 마련 저축성 보험', '사업비 공제로 인해 초기 해지 시 원금 손실이 발생할 수 있습니다.'),
  ('달러보험', '미국 달러 표시 보험상품', '환율 변동에 따라 환차손이 발생할 수 있으며 원금이 보장되지 않습니다.'),
  ('간병보험', '장기요양/간병 상태 보장 보험', '장기요양등급 등 보험금 지급 기준을 가입 전 반드시 확인하세요.'),
  ('어린이보험', '태아/어린이 대상 보장 보험', '성인 전환 시 보장 내용 및 보험료가 변경될 수 있습니다.'),
  ('법인보험', '법인 계약자 대상 보험상품', '세무/회계 처리는 보험상품과 별개로 반드시 세무 전문가와 상담하세요.'),
  ('기타', '기타 보험상품', '정확한 보장 내용과 약관은 반드시 해당 보험사 자료를 통해 확인하시기 바랍니다.')
on conflict (name) do nothing;
