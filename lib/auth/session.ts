import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// React.cache()로 감싸면 같은 요청(페이지 렌더링 1회) 안에서 여러 번
// 호출해도 실제 Supabase 요청은 한 번만 나간다. 레이아웃과 페이지가
// 각자 따로 로그인 확인 + 프로필 조회를 하던 중복을 제거하기 위함.
// (요청이 끝나면 캐시도 사라지므로 다른 사용자/다른 요청과 섞일 위험 없음)

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getFullProfile = cache(async (userId: string) => {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
})
