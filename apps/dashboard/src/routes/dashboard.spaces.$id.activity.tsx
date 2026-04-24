import { api } from "@dodev/convex/api"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"
import { ActivityLog } from "@/components/dashboard/activity-log"
import { useAuth } from "@/components/providers/auth-provider"

interface McpLog {
  status: "ok" | "error"
}

export const Route = createFileRoute("/dashboard/spaces/$id/activity")({
  component: SpaceActivityRoute,
})

function SpaceActivityRoute() {
  const { id } = useParams({ from: "/dashboard/spaces/$id/activity" })
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const logs = useQuery(
    api.mcpLogs.list,
    apiKeyHash ? { apiKeyHash, spaceId: id, limit: 100 } : "skip"
  ) as McpLog[] | undefined

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const okCount = (logs ?? []).filter((l) => l.status === "ok").length
  const errorCount = (logs ?? []).filter((l) => l.status === "error").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
        <div className="mt-0.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">MCP tool calls scoped to this space</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="size-3" />
              {logs?.length ?? 0} calls
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {okCount} ok
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="size-3 text-red-500" />
              {errorCount} errors
            </span>
          </div>
        </div>
      </div>
      <ActivityLog logs={logs as Parameters<typeof ActivityLog>[0]["logs"]} />
    </div>
  )
}
