import { createFileRoute } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { LiveSessionsPanel } from "@/components/dashboard/live-sessions/live-sessions-panel"
import { useAuth } from "@/components/providers/auth-provider"

export const Route = createFileRoute("/dashboard/live")({
  component: LiveRoute,
})

function LiveRoute() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Live Sessions</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Every connected agent right now. Dot color tracks freshness — red means a session has been
          silent for 5+ minutes and may be stuck.
        </p>
      </div>
      <LiveSessionsPanel />
    </div>
  )
}
