'use client'

import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AnnouncementBanner } from '@/components/notices/announcement-banner'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile
  planName: string
  children: React.ReactNode
}

export function DashboardShell({ profile, planName, children }: DashboardShellProps) {
  return (
    <div className="md:pl-64">
      <OnboardingModal />
      <Header profile={profile} planName={planName} />
      <main className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 space-y-4">
        <AnnouncementBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
