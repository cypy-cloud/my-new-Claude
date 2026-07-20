-- ============================================================
-- Migration 057: Customer contact type (일반 고객 / 리크루팅 후보)
-- ------------------------------------------------------------
-- 경력 설계사의 주요 수입원 중 하나가 신규 설계사 리크루팅이라, 고객관리와
-- 동일한 구조(명단·메모·AI 문자/스크립트 연동)를 리크루팅 후보 관리에도
-- 재사용할 수 있도록 customers 테이블에 구분 필드만 추가한다. 완전히 새로운
-- 테이블/화면을 만드는 대신 기존 고객관리를 확장하는 방식 — 리스크를 최소화.
-- 기존 행은 전부 기본값 'customer'로 채워져 기존 동작에 영향 없음.
-- ============================================================

alter table public.customers
  add column if not exists contact_type text not null default 'customer'
    check (contact_type in ('customer', 'recruit'));

create index if not exists idx_customers_user_contact_type on public.customers(user_id, contact_type);
