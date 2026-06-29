-- 관리자는 파일 메타데이터만 조회 가능, 원본 내용(extracted_text, storage_path)은 제외
-- 기존 'admins can read all files' 정책을 메타데이터 전용으로 교체

drop policy if exists "admins can read all files" on public.uploaded_files;

create policy "admins can read file metadata only" on public.uploaded_files
  for select using (
    auth.uid() = user_id
    or (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'super_admin')
      )
    )
  );

-- generated_outputs: 관리자가 통계용으로 집계만 가능 (내용 미포함)
drop policy if exists "admins can read all outputs" on public.generated_outputs;

create policy "admins can read output metadata" on public.generated_outputs
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- event_logs: 관리자 전체 읽기 허용 (통계 분석용)
drop policy if exists "admins can read all" on public.event_logs;

create policy "admins can read all event_logs" on public.event_logs
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- usage_records: 관리자 전체 읽기 허용
drop policy if exists "admins can read all usage" on public.usage_records;

create policy "admins can read all usage_records" on public.usage_records
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
