-- Fix handle_new_user(): production public.profiles no longer matches the
-- shape from migration 001/047 — profiles.id IS the auth.users.id directly
-- (no separate user_id column), and the name column is actually full_name
-- (per all app queries using .eq('id', authUserId) and .select('full_name')).
-- The trigger still referenced the old user_id/name columns, causing every
-- new signup to fail with "column ... does not exist".

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, company_name, insurance_company,
    terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'insurance_company',
    case when (new.raw_user_meta_data->>'terms_agreed')::boolean then now() else null end,
    new.raw_user_meta_data->>'terms_version',
    case when (new.raw_user_meta_data->>'privacy_agreed')::boolean then now() else null end,
    new.raw_user_meta_data->>'privacy_version',
    case when (new.raw_user_meta_data->>'marketing_agreed')::boolean then now() else null end
  );

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;
