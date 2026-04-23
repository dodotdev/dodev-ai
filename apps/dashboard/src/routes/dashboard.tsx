import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export const Route = createFileRoute("/dashboard")({
  component: DashboardShell,
})

function DashboardShell() {
  return (
    <div className="flex h-full bg-background text-foreground">
      <aside className="flex w-64 shrink-0 border-r border-border/50">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
