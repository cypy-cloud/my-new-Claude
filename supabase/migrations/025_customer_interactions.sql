-- Consultation/contact history per customer, shown as a timeline on the customer
-- detail page. Lets an agent log a call/meeting/etc, set a next action + follow-up
-- date, and later generate a follow-up message or objection-handling script from
-- that history.

create table if not exists public.customer_interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('call', 'meeting', 'kakao', 'sms', 'contract', 'followup', 'memo')),
  title text not null,
  content text,
  next_action text,
  next_action_date date,
  sentiment text not null default 'unknown' check (sentiment in ('positive', 'neutral', 'negative', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interactions_user on public.customer_interactions(user_id);
create index if not exists idx_interactions_customer on public.customer_interactions(customer_id, created_at desc);
create index if not exists idx_interactions_next_action_date on public.customer_interactions(user_id, next_action_date) where next_action_date is not null;

alter table public.customer_interactions enable row level security;

drop policy if exists "Users manage own customer interactions" on public.customer_interactions;
create policy "Users manage own customer interactions" on public.customer_interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
