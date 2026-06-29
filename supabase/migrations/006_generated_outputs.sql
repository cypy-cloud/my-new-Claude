create table if not exists generated_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('sms', 'script', 'pdf_explanation')),
  title text not null,
  input_data jsonb not null default '{}',
  output_text text not null,
  prompt_version text,
  ai_provider text,
  model text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_generated_outputs_user_id on generated_outputs(user_id);
create index idx_generated_outputs_type on generated_outputs(type);
create index idx_generated_outputs_created_at on generated_outputs(created_at desc);
create index idx_generated_outputs_favorite on generated_outputs(user_id, is_favorite) where is_favorite = true;

alter table generated_outputs enable row level security;

create policy "users can manage own outputs" on generated_outputs
  for all using (auth.uid() = user_id);

create policy "admins can read all outputs" on generated_outputs
  for select using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
