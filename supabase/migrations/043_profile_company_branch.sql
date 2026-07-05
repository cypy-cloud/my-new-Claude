-- 프로필에 보험사/지점명 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS branch  TEXT,
  ADD COLUMN IF NOT EXISTS phone   TEXT;
