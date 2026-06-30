-- User onboarding: tracks first-login tutorial/onboarding completion per user.

create table if not exists public.user_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_intro boolean not null default false,
  completed_sms_tutorial boolean not null default false,
  completed_script_tutorial boolean not null default false,
  completed_pdf_tutorial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_user_onboarding_user_id on public.user_onboarding(user_id);

drop trigger if exists user_onboarding_updated_at on public.user_onboarding;
create trigger user_onboarding_updated_at before update on public.user_onboarding
  for each row execute function public.set_updated_at();

alter table public.user_onboarding enable row level security;

drop policy if exists "Users can view own onboarding" on public.user_onboarding;
create policy "Users can view own onboarding" on public.user_onboarding
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own onboarding" on public.user_onboarding;
create policy "Users can insert own onboarding" on public.user_onboarding
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own onboarding" on public.user_onboarding;
create policy "Users can update own onboarding" on public.user_onboarding
  for update using (auth.uid() = user_id);

drop policy if exists "Admins can manage onboarding" on public.user_onboarding;
create policy "Admins can manage onboarding" on public.user_onboarding
  for all using (public.is_admin());
