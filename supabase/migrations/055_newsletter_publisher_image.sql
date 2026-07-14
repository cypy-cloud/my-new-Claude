-- 뉴스레터 이미지 하단 발행인 정보(이름·연락처) 옆에 표시할 로고/프로필 사진.
-- 계정당 1장만 등록 가능(설정 페이지에서 관리) — 뉴스레터 이미지 패널에서는 수정 불가,
-- 발행인 이름·연락처와 동일한 원칙(계정 공유 방지)을 따른다.

alter table profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('newsletter-avatars', 'newsletter-avatars', true)
on conflict (id) do nothing;

-- 본인 폴더(파일 경로 맨 앞이 자신의 user id)에만 업로드/수정/삭제 가능
drop policy if exists "Users can upload own newsletter avatar" on storage.objects;
create policy "Users can upload own newsletter avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'newsletter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own newsletter avatar" on storage.objects;
create policy "Users can update own newsletter avatar"
  on storage.objects for update
  using (
    bucket_id = 'newsletter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own newsletter avatar" on storage.objects;
create policy "Users can delete own newsletter avatar"
  on storage.objects for delete
  using (
    bucket_id = 'newsletter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 뉴스레터 이미지 캡처(html-to-image)가 브라우저에서 이 URL을 직접 불러와야 하므로 공개 읽기 허용
drop policy if exists "Public read access to newsletter avatars" on storage.objects;
create policy "Public read access to newsletter avatars"
  on storage.objects for select
  using (bucket_id = 'newsletter-avatars');
