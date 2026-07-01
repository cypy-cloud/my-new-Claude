-- 036_notifications.sql
-- 앱 내부 알림 센터

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('announcement', 'usage_limit', 'file_delete', 'billing', 'system', 'team')),
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  action_url  text,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx    on public.notifications(user_id);
create index if not exists notifications_is_read_idx    on public.notifications(user_id, is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

create policy "users_manage_own_notifications" on public.notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "service_insert_notifications" on public.notifications for insert
  with check (true);
