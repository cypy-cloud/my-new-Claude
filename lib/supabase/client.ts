import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Next.js only inlines NEXT_PUBLIC_* env vars on the client when accessed via a
// static `process.env.NEXT_PUBLIC_X` expression, not a dynamic `process.env[name]`
// lookup, so these must be read directly here rather than through requireEnv(name).
function requireClientEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`환경변수 ${name}가 설정되지 않았습니다. .env.local을 확인하세요.`)
  }
  return value
}

export function createClient() {
  return createBrowserClient<Database>(
    requireClientEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireClientEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
}
