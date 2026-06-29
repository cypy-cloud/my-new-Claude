-- Event logs table for user behavior tracking
create table if not exists event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  feature_type text,
  page_path text,
  metadata jsonb,
  device_type text,
  browser text,
  created_at timestamptz not null default now()
);

create index idx_event_logs_user_id on event_logs(user_id);
create index idx_event_logs_event_name on event_logs(event_name);
create index idx_event_logs_created_at on event_logs(created_at desc);
create index idx_event_logs_feature_type on event_logs(feature_type) where feature_type is not null;

alter table event_logs enable row level security;

-- Admins can read all logs
create policy "admins can read event_logs" on event_logs
  for select using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- Server-side inserts via service role (no client insert policy needed)
