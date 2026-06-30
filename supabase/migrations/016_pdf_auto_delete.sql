-- Original PDF auto-deletion: allow uploaded_files.status to track files whose original
-- PDF has been removed (by storage-retention expiry) while extracted_text/summary_text
-- and any generated outputs remain intact. Distinct from 'deleted', which is a full
-- user-initiated removal that also clears extracted_text.

alter table public.uploaded_files drop constraint if exists uploaded_files_status_check;
alter table public.uploaded_files add constraint uploaded_files_status_check
  check (status in ('uploaded', 'processing', 'completed', 'failed', 'deleted', 'original_expired'));

create index if not exists idx_uploaded_files_delete_after on public.uploaded_files(delete_after)
  where status not in ('deleted', 'original_expired');
