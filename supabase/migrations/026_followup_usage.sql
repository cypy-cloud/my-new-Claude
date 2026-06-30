-- ============================================================
-- Migration 026: CRM Follow-up Recommendation Usage Tracking
-- ============================================================

alter table public.usage_records
  add column if not exists followup_count integer not null default 0;

create or replace function public.increment_usage_record(
  p_user_id uuid,
  p_feature text,                 -- 'sms' | 'script' | 'followup' | 'pdf_upload' | 'pdf_analysis'
  p_token_input integer default 0,
  p_token_output integer default 0,
  p_cost numeric default 0,
  p_storage_mb numeric default 0
) returns void language plpgsql security definer as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage_records (user_id, usage_month)
  values (p_user_id, v_month)
  on conflict (user_id, usage_month) do nothing;

  update public.usage_records set
    sms_count           = sms_count           + case when p_feature = 'sms'          then 1 else 0 end,
    script_count        = script_count        + case when p_feature = 'script'        then 1 else 0 end,
    followup_count       = followup_count       + case when p_feature = 'followup'      then 1 else 0 end,
    pdf_upload_count    = pdf_upload_count    + case when p_feature = 'pdf_upload'    then 1 else 0 end,
    pdf_analysis_count  = pdf_analysis_count  + case when p_feature = 'pdf_analysis'  then 1 else 0 end,
    ai_token_input      = ai_token_input      + p_token_input,
    ai_token_output     = ai_token_output     + p_token_output,
    ai_cost_estimate    = ai_cost_estimate    + p_cost,
    storage_used_mb     = storage_used_mb     + p_storage_mb,
    updated_at          = now()
  where user_id = p_user_id and usage_month = v_month;
end;
$$;
