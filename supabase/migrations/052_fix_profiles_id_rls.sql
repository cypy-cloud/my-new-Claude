-- Same root cause as 051: production public.profiles has no user_id column
-- (profiles.id IS the auth.users.id directly). Several RLS policies and the
-- is_admin() helper still filtered on profiles.user_id, which doesn't exist
-- on the live table — so every RLS-scoped (non-admin-client) read/update of
-- a user's own profile silently returned zero rows, and is_admin() silently
-- evaluated to false for everyone. This broke "own profile" visibility
-- app-wide (e.g. /billing showing the wrong current plan) and any
-- RLS-enforced admin-read policy that depends on is_admin().

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'super_admin')
    and status = 'active'
  )
$$;

alter policy "Users can view own profile" on public.profiles
  using (auth.uid() = id);

alter policy "Users can update own profile" on public.profiles
  using (auth.uid() = id);

alter policy "admins can read event_logs" on event_logs
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

alter policy "admins can read all outputs" on generated_outputs
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

alter policy "admins can read all files" on uploaded_files
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
