"use client"

import { ConvexProvider } from "./convex-provider"
import { AuthProvider } from "./auth-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

interface DashboardProvidersProps {
  workosUserId: string
  email: string
  name?: string
  children: React.ReactNode
}

export function DashboardProviders({
  workosUserId,
  email,
  name,
  children,
}: DashboardProvidersProps) {
  return (
    <ConvexProvider>
      <AuthProvider workosUserId={workosUserId} email={email} name={name}>
        <div className="relative isolate flex min-h-svh w-full bg-surface dark:bg-background">
          <DashboardHeader />

          {/* Desktop sidebar */}
          <div
            style={{ width: 240 }}
            className="fixed bottom-0 left-0 top-[68px] max-lg:hidden overflow-y-auto"
          >
            <DashboardSidebar />
          </div>

          {/* Main content */}
          <main className="flex-1 pt-[68px] lg:pl-[240px]">
            <div className="px-6 py-6 lg:px-8">{children}</div>
          </main>
        </div>
      </AuthProvider>
    </ConvexProvider>
  )
}
