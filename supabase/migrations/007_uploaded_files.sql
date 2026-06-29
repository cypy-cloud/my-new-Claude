create table if not exists uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_file_name text not null,
  storage_path text,
  file_size_mb numeric(10,3) not null default 0,
  file_type text not null default 'pdf',
  extracted_text text,
  summary_text text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'completed', 'failed', 'deleted')),
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_uploaded_files_user_id on uploaded_files(user_id);
create index idx_uploaded_files_status on uploaded_files(user_id, status);
create index idx_uploaded_files_created_at on uploaded_files(created_at desc);

alter table uploaded_files enable row level security;

create policy "users can manage own files" on uploaded_files
  for all using (auth.uid() = user_id);

create policy "admins can read all files" on uploaded_files
  for select using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
