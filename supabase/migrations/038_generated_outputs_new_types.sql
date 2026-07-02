-- 038_generated_outputs_new_types.sql
-- Add newsletter and content types to generated_outputs

alter table public.generated_outputs
  drop constraint if exists generated_outputs_type_check;

alter table public.generated_outputs
  add constraint generated_outputs_type_check
  check (type in ('sms', 'script', 'pdf_explanation', 'newsletter', 'content'));
