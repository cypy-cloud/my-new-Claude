-- 이용후기 이벤트용 'review' 카테고리를 feedback.category 허용값에 추가
alter table public.feedback drop constraint if exists feedback_category_check;

alter table public.feedback add constraint feedback_category_check
  check (category in ('review', 'bug', 'feature_request', 'improvement', 'billing', 'other'));
