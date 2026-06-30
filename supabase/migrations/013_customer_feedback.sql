-- Customer feedback: rework existing `feedback` table (was a simple satisfaction
-- rating widget, never wired to any API) into a full feedback/ticket model with
-- category, title, content, status workflow, priority, and admin memo.

alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback drop column if exists rating;

alter table public.feedback rename column feature to category;
alter table public.feedback rename column comment to content;

alter table public.feedback alter column content drop not null;
alter table public.feedback add column if not exists title text;
alter table public.feedback add column if not exists priority text not null default 'medium';
alter table public.feedback add column if not exists admin_memo text;
alter table public.feedback add column if not exists updated_at timestamptz not null default now();

update public.feedback set category = 'other' where category is null;
alter table public.feedback alter column category set not null;
alter table public.feedback alter column category set default 'other';
alter table public.feedback alter column content set not null;
alter table public.feedback alter column status set default 'open';
update public.feedback set status = 'open' where status = 'pending';
update public.feedback set status = 'resolved' where status not in ('open', 'reviewing', 'planned', 'resolved', 'closed');

alter table public.feedback add constraint feedback_category_check
  check (category in ('bug', 'feature_request', 'improvement', 'billing', 'other'));
alter table public.feedback add constraint feedback_status_check
  check (status in ('open', 'reviewing', 'planned', 'resolved', 'closed'));
alter table public.feedback add constraint feedback_priority_check
  check (priority in ('low', 'medium', 'high'));

create index if not exists idx_feedback_user_id on public.feedback(user_id);
create index if not exists idx_feedback_status on public.feedback(status);
create index if not exists idx_feedback_category on public.feedback(category);
create index if not exists idx_feedback_created_at on public.feedback(created_at desc);

drop trigger if exists feedback_updated_at on public.feedback;
create trigger feedback_updated_at before update on public.feedback
  for each row execute function public.set_updated_at();

-- Replace old read-only admin policy with a full manage policy (view + update)
drop policy if exists "Admins can view all feedback" on public.feedback;
create policy "Admins can manage feedback" on public.feedback
  for all using (public.is_admin());
