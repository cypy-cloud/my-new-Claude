-- Track terms/privacy/marketing consent at signup for legal compliance.
-- Populated via handle_new_user() from auth signup metadata (same pattern as
-- phone/company_name/insurance_company below), so consent is recorded even
-- before the user's email is verified.

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists marketing_agreed_at timestamptz;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    user_id, email, name, phone, company_name, insurance_company,
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
