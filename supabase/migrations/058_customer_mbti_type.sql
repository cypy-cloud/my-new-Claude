-- ============================================================
-- Migration 058: Customer MBTI type
-- ------------------------------------------------------------
-- 고객 성향분석에서 MBTI를 매번 다시 입력해야 하는 불편을 없애기 위해,
-- 고객관리(customers)에 MBTI를 저장해두고 "기존 고객 불러오기" 시 자동으로
-- 채워지도록 한다. 기존 행은 전부 null(미입력)이라 기존 동작에 영향 없음.
-- ============================================================

alter table public.customers
  add column if not exists mbti_type text
    check (mbti_type is null or mbti_type in (
      'ISTJ','ISFJ','INFJ','INTJ',
      'ISTP','ISFP','INFP','INTP',
      'ESTP','ESFP','ENFP','ENTP',
      'ESTJ','ESFJ','ENFJ','ENTJ'
    ));
