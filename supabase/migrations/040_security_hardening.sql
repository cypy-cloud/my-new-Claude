-- 040_security_hardening.sql
-- plans 테이블 RLS 추가 (공개 읽기 전용, 관리자만 수정)

alter table public.plans enable row level security;

-- 로그인한 사용자 누구나 요금제 목록 읽기 가능
create policy "plans_public_read"
  on public.plans for select
  using (auth.role() = 'authenticated');

-- 수정/삭제는 service role만 (관리자 UI는 service role 클라이언트 사용)
