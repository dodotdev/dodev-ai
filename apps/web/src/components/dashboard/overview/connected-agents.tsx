"use client"

import { api } from "@dodev/convex/api"
import { useQuery } from "convex/react"
import { Monitor, Terminal, Wifi, WifiOff } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { cn, formatRelativeTime } from "@/lib/utils"

/** Derive a friendly display name from client metadata */
function getAgentDisplayName(clientName?: string, clientId?: string): string {
  if (clientName) return clientName
  if (clientId) return `Agent ${clientId.slice(0, 8)}`
  return "Unknown Agent"
}

/** Pick an icon based on client name */
function getAgentIcon(clientName?: string) {
  const name = (clientName ?? "").toLowerCase()
  if (name.includes("claude") || name.includes("cursor") || name.includes("windsurf")) {
    return Terminal
  }
  return Monitor
}

interface AgentSession {
  _id: string
  sessionId: string
  clientId: string
  clientName?: string
  status: "connected" | "disconnected" | "expired"
  connectedAt: number
  lastActivityAt: number
  toolCallCount: number
  lastTool?: string
}

export function ConnectedAgents() {
  const { apiKeyHash } = useAuth()

  const activeSessions = useQuery(
    api.agentSessions.listActive,
    apiKeyHash ? { apiKeyHash } : "skip"
  ) as AgentSession[] | undefined

  const count = activeSessions?.length ?? 0

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Connected Agents</h3>
          {count > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {count}
            </span>
          )}
        </div>
        {count > 0 ? (
          <Wifi className="size-3.5 text-emerald-500" />
        ) : (
          <WifiOff className="size-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Sessions */}
      {count === 0 ? (
        <div className="px-4 py-8 text-center">
          <WifiOff className="mx-auto size-5 text-muted-foreground/40" />
          <p className="mt-2 text-xs text-muted-foreground">
            No agents connected. Connect an AI agent via MCP to get started.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {activeSessions!.map((session) => {
            const Icon = getAgentIcon(session.clientName)
            const name = getAgentDisplayName(session.clientName, session.clientId)

            return (
              <div key={session._id} className="flex items-center gap-3 px-4 py-3">
                {/* Icon with pulse */}
                <div className="relative shrink-0">
                  <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-500/10">
                    <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-card animate-pulse" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Connected {formatRelativeTime(session.connectedAt)}</span>
                    {session.toolCallCount > 0 && (
                      <>
                        <span className="text-border">|</span>
                        <span className="tabular-nums">
                          {session.toolCallCount} call{session.toolCallCount !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Last tool */}
                {session.lastTool && (
                  <code
                    className={cn(
                      "hidden shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block",
                      "dark:bg-zinc-800"
                    )}
                  >
                    {session.lastTool}
                  </code>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
