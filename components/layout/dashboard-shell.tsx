'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile
  planName: string
  children: React.ReactNode
}

export function DashboardShell({ profile, planName, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="md:pl-64">
      <Header profile={profile} planName={planName} onMenuToggle={() => setMobileNavOpen(true)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
