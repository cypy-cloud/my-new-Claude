-- "건강보험" is offered as a 관심 상품 chip option in script/message generators,
-- but was missing from the seeded product_categories list (021_product_categories.sql),
-- so users could never match it to a category with its own risk_notice.
insert into public.product_categories (name, description, risk_notice)
values
  ('건강보험', '질병/상해/입원·수술 등을 폭넓게 보장하는 종합 건강보장 보험', '갱신형/비갱신형 여부, 특약별 보장 한도, 면책기간(가입 후 90일 등)을 반드시 확인하세요.')
on conflict (name) do nothing;
