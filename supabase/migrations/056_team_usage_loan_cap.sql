-- ============================================================
-- Migration 056: Team usage loan cap
-- ------------------------------------------------------------
-- 팀원이 본인 한도 소진 시 팀장(프리미엄) 한도에서 대신 차감하는
-- reserveUsage() 기능은 기존에 팀 규모와 무관하게 팀장의 남은
-- 개인 한도 전체를 소진할 수 있었음. 팀장 본인 사용량을 최소한
-- 보장하기 위해, 팀 전체가 이번 달에 팀장에게서 빌려갈 수 있는
-- 총량에 별도 상한(캡)을 둔다 — 문자 20 / 스크립트 10 / PDF분석 15건
-- (lib/subscription/usage.ts의 TEAM_LOAN_CAPS). 이 테이블은 그
-- 누적 대여량만 별도로 추적하고, 실제 사용량 차감(usage_records)은
-- 기존과 동일하게 팀장 계정으로 그대로 쌓인다.
-- ============================================================

create table if not exists public.team_usage_loans (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  usage_month text not null,          -- 'YYYY-MM'
  sms_borrowed integer not null default 0,
  script_borrowed integer not null default 0,
  pdf_analysis_borrowed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, usage_month)
);

-- 서비스롤(admin client) 전용 — discount_codes/discount_code_redemptions와 동일한 패턴.
-- 팀원/팀장 세션에서 직접 조회할 UI가 아직 없어 select 정책도 열지 않는다.
alter table public.team_usage_loans enable row level security;
create policy "Service role only" on public.team_usage_loans for all using (false);

create index if not exists idx_team_usage_loans_team_month on public.team_usage_loans(team_id, usage_month);

create trigger team_usage_loans_updated_at before update on public.team_usage_loans
  for each row execute function public.set_updated_at();

create or replace function public.increment_team_loan(
  p_team_id uuid,
  p_feature text                  -- 'sms' | 'script' | 'pdf_analysis'
) returns void language plpgsql security definer as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.team_usage_loans (team_id, usage_month)
  values (p_team_id, v_month)
  on conflict (team_id, usage_month) do nothing;

  update public.team_usage_loans set
    sms_borrowed           = sms_borrowed           + case when p_feature = 'sms'          then 1 else 0 end,
    script_borrowed        = script_borrowed        + case when p_feature = 'script'       then 1 else 0 end,
    pdf_analysis_borrowed  = pdf_analysis_borrowed  + case when p_feature = 'pdf_analysis'  then 1 else 0 end,
    updated_at              = now()
  where team_id = p_team_id and usage_month = v_month;
end;
$$;
