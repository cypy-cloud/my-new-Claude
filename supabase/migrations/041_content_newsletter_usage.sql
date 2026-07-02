-- 041_content_newsletter_usage.sql
-- usage_records에 content/newsletter 별도 카운트 컬럼 추가
-- increment_usage_record RPC 함수 업데이트

alter table public.usage_records
  add column if not exists content_count    integer not null default 0,
  add column if not exists newsletter_count integer not null default 0;

-- increment_usage_record 함수 재정의 (content, newsletter 추가)
create or replace function public.increment_usage_record(
  p_user_id       uuid,
  p_feature       text,                 -- 'sms' | 'script' | 'followup' | 'pdf_upload' | 'pdf_analysis' | 'content' | 'newsletter'
  p_token_input   integer default 0,
  p_token_output  integer default 0,
  p_cost          numeric default 0,
  p_storage_mb    numeric default 0
) returns void language plpgsql security definer as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage_records (
    user_id, usage_month,
    sms_count, script_count, followup_count, pdf_upload_count, pdf_analysis_count,
    content_count, newsletter_count,
    ai_token_input, ai_token_output, ai_cost_estimate, storage_used_mb
  ) values (
    p_user_id, v_month,
    case when p_feature = 'sms'          then 1 else 0 end,
    case when p_feature = 'script'        then 1 else 0 end,
    case when p_feature = 'followup'      then 1 else 0 end,
    case when p_feature = 'pdf_upload'    then 1 else 0 end,
    case when p_feature = 'pdf_analysis'  then 1 else 0 end,
    case when p_feature = 'content'       then 1 else 0 end,
    case when p_feature = 'newsletter'    then 1 else 0 end,
    p_token_input, p_token_output, p_cost, p_storage_mb
  )
  on conflict (user_id, usage_month) do update set
    sms_count           = usage_records.sms_count           + case when p_feature = 'sms'          then 1 else 0 end,
    script_count        = usage_records.script_count        + case when p_feature = 'script'        then 1 else 0 end,
    followup_count      = usage_records.followup_count      + case when p_feature = 'followup'      then 1 else 0 end,
    pdf_upload_count    = usage_records.pdf_upload_count    + case when p_feature = 'pdf_upload'    then 1 else 0 end,
    pdf_analysis_count  = usage_records.pdf_analysis_count  + case when p_feature = 'pdf_analysis'  then 1 else 0 end,
    content_count       = usage_records.content_count       + case when p_feature = 'content'       then 1 else 0 end,
    newsletter_count    = usage_records.newsletter_count    + case when p_feature = 'newsletter'    then 1 else 0 end,
    ai_token_input      = usage_records.ai_token_input      + p_token_input,
    ai_token_output     = usage_records.ai_token_output     + p_token_output,
    ai_cost_estimate    = usage_records.ai_cost_estimate    + p_cost,
    storage_used_mb     = usage_records.storage_used_mb     + p_storage_mb,
    updated_at          = now();
end;
$$;
