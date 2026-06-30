-- AI Core Engine: widen feature_type CHECK constraints to support the new
-- 8-feature vocabulary (sms_message, sales_script, pdf_explanation, newsletter,
-- blog_content, crm_followup, objection_handling, product_summary) while keeping
-- the legacy values (ai_message/ai_script/ai_document, sms/script/pdf_explanation)
-- so the existing 3 routes keep working unmodified.

alter table ai_requests drop constraint if exists ai_requests_feature_type_check;
alter table ai_requests add constraint ai_requests_feature_type_check
  check (feature_type in (
    'ai_message', 'ai_script', 'ai_document',
    'sms_message', 'sales_script', 'pdf_explanation',
    'newsletter', 'blog_content', 'crm_followup', 'objection_handling', 'product_summary'
  ));

alter table ai_cache drop constraint if exists ai_cache_feature_type_check;
alter table ai_cache add constraint ai_cache_feature_type_check
  check (feature_type in (
    'ai_message', 'ai_script', 'ai_document',
    'sms_message', 'sales_script', 'pdf_explanation',
    'newsletter', 'blog_content', 'crm_followup', 'objection_handling', 'product_summary'
  ));

alter table request_locks drop constraint if exists request_locks_feature_type_check;
alter table request_locks add constraint request_locks_feature_type_check
  check (feature_type in (
    'ai_message', 'ai_script', 'ai_document',
    'sms_message', 'sales_script', 'pdf_explanation',
    'newsletter', 'blog_content', 'crm_followup', 'objection_handling', 'product_summary'
  ));

alter table prompt_versions drop constraint if exists prompt_versions_feature_type_check;
alter table prompt_versions add constraint prompt_versions_feature_type_check
  check (feature_type in (
    'sms', 'script', 'pdf_explanation',
    'sms_message', 'sales_script', 'newsletter', 'blog_content',
    'crm_followup', 'objection_handling', 'product_summary'
  ));
