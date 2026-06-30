-- ============================================================
-- Migration 027: Allow 'ai_followup' in ai_cache / request_locks
-- ============================================================
-- ai_cache and request_locks were created in migration 004 with a
-- check constraint limited to ('ai_message', 'ai_script', 'ai_document').
-- The new ai_followup feature was never added, so every lock upsert for
-- ai_followup silently failed the check constraint, making
-- acquireRequestLock() always return acquired: false (permanent 409).

alter table public.ai_cache
  drop constraint if exists ai_cache_feature_type_check;
alter table public.ai_cache
  add constraint ai_cache_feature_type_check
  check (feature_type in ('ai_message', 'ai_script', 'ai_document', 'ai_followup'));

alter table public.request_locks
  drop constraint if exists request_locks_feature_type_check;
alter table public.request_locks
  add constraint request_locks_feature_type_check
  check (feature_type in ('ai_message', 'ai_script', 'ai_document', 'ai_followup'));

-- Clear out any stale locks left over from failed ai_followup attempts
delete from public.request_locks where feature_type = 'ai_followup';
