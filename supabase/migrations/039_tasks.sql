-- 039_tasks.sql
-- 보험설계사 업무 캘린더 - tasks table

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  customer_id   uuid references public.customers(id) on delete set null,
  title         text not null,
  description   text,
  task_type     text not null default 'other'
                  check (task_type in ('followup', 'meeting', 'birthday', 'renewal', 'review', 'other')),
  due_date      date not null,
  due_time      time,                          -- optional specific time
  status        text not null default 'pending'
                  check (status in ('pending', 'completed', 'canceled')),
  priority      text not null default 'medium'
                  check (priority in ('low', 'medium', 'high')),
  -- Google Calendar 연동을 위한 확장 필드 (향후 사용)
  gcal_event_id text,
  gcal_synced_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table public.tasks enable row level security;

create policy "tasks_owner" on public.tasks
  for all using (auth.uid() = user_id);

-- Indexes
create index idx_tasks_user_due    on public.tasks(user_id, due_date);
create index idx_tasks_customer    on public.tasks(customer_id) where customer_id is not null;
create index idx_tasks_status      on public.tasks(user_id, status);

-- updated_at trigger
create or replace function public.set_tasks_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_tasks_updated_at();
