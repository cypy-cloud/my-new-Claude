import { Rocket } from "lucide-react"
import { PageTracker } from "@/components/analytics/page-tracker"
import { ChangelogList } from "@/components/changelog/changelog-list"
import { createAdminClient } from "@/lib/supabase/admin"

async function getCurrentVersion(): Promise<string | null> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('app_versions')
    .select('version')
    .eq('is_current', true)
    .maybeSingle()
  return data?.version ?? null
}

export default async function ChangelogPage() {
  const currentVersion = await getCurrentVersion()

  return (
    <div className="space-y-6 max-w-3xl">
      <PageTracker event="changelog_view" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <Rocket className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            변경사항
            {currentVersion && (
              <span className="text-xs font-medium bg-orange-100 text-orange-600 rounded-full px-2.5 py-1">
                현재 {currentVersion}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">서비스 업데이트 내역을 확인하세요</p>
        </div>
      </div>
      <ChangelogList />
    </div>
  )
}
