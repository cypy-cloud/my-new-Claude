'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AnnouncementBanner } from '@/components/notices/announcement-banner'
import { VersionBanner } from '@/components/changelog/version-banner'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { UpsellBanner } from '@/components/billing/upsell-banner'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile
  planName: string
  children: React.ReactNode
}

export function DashboardShell({ profile, planName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="md:pl-64">
      {/* 모바일 사이드바 오버레이 */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
            <Sidebar profile={profile} onNavigate={() => setMobileOpen(false)} mobile />
          </div>
        </>
      )}

      <OnboardingModal />
      <Header profile={profile} planName={planName} onMenuToggle={() => setMobileOpen(o => !o)} />
      <main className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 space-y-4">
        <AnnouncementBanner />
        <VersionBanner />
        <UpsellBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
