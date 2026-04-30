/**
 * Live Sessions Panel — tile grid showing every connected/recently-active
 * agent session with a real-time freshness indicator.
 *
 * Inspired by storybloq's monitoring view (see assets/monitoring.png in
 * gits/storybloq). Shared between web and Electron — the desktop app
 * loads this same dashboard renderer; we don't fork.
 *
 * Convex live queries auto-resubscribe; the dot color is recomputed on
 * a 5s interval so freshness shifts even if no new tool call happens.
 */
import { api } from "@dodev/convex/api"
import { useQuery } from "convex/react"
import { Activity, Bot, Clock, Hash, Loader2, Plug, PlugZap, Wrench } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

type SessionStatus = "connected" | "disconnected" | "expired"

interface LiveSession {
  _id: string
  sessionId: string
  clientId: string
  clientName?: string
  agentId?: string
  status: SessionStatus
  connectedAt: number
  lastActivityAt: number
  disconnectedAt?: number
  toolCallCount: number
  lastTool?: string
}

type Freshness = "active" | "idle" | "stalled" | "stuck" | "offline"

interface FreshnessSpec {
  label: string
  /** Tailwind dot bg color */
  dotClass: string
  /** Subtle ring color for the tile when this is the freshness */
  ringClass: string
  /** How to phrase the time-since label */
  cadence: "live" | "relative"
}

const FRESHNESS: Record<Freshness, FreshnessSpec> = {
  active: {
    label: "Active",
    dotClass: "bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)]",
    ringClass: "ring-emerald-500/30",
    cadence: "live",
  },
  idle: {
    label: "Idle",
    dotClass: "bg-yellow-400",
    ringClass: "ring-yellow-400/20",
    cadence: "live",
  },
  stalled: {
    label: "Stalled",
    dotClass: "bg-orange-500",
    ringClass: "ring-orange-500/20",
    cadence: "relative",
  },
  stuck: {
    label: "Stuck",
    dotClass: "bg-red-500",
    ringClass: "ring-red-500/30",
    cadence: "relative",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-gray-400 dark:bg-gray-600",
    ringClass: "ring-border",
    cadence: "relative",
  },
}

function classifyFreshness(session: LiveSession, now: number): Freshness {
  if (session.status !== "connected") return "offline"
  const age = now - session.lastActivityAt
  if (age < 30_000) return "active"
  if (age < 2 * 60_000) return "idle"
  if (age < 5 * 60_000) return "stalled"
  return "stuck"
}

function timeAgo(ts: number, now: number): string {
  const diff = now - ts
  if (diff < 1_000) return "just now"
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

function shortAgentId(id: string | undefined): string {
  if (!id) return "—"
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

function clientLabel(session: LiveSession): string {
  if (session.clientName) return session.clientName
  if (session.clientId) return session.clientId
  return "Anonymous agent"
}

interface LiveSessionsPanelProps {
  /** Visual variant. "compact" trims metadata for embedding on dashboards. */
  variant?: "full" | "compact"
  /** Override window in ms. Default: 1 hour. */
  windowMs?: number
}

export function LiveSessionsPanel({
  variant = "full",
  windowMs = 60 * 60 * 1000,
}: LiveSessionsPanelProps) {
  const { apiKeyHash } = useAuth()
  const sessions = useQuery(
    api.agentSessions.listRecentlyActive,
    apiKeyHash ? { apiKeyHash, sinceMs: windowMs } : "skip"
  ) as LiveSession[] | undefined

  // Tick every 5s so freshness dots shift even when no tool call lands.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000)
    return () => clearInterval(id)
  }, [])

  if (sessions === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return <EmptyState compact={variant === "compact"} />
  }

  // Sort: connected first, then by lastActivityAt desc.
  const ordered = [...sessions].sort((a, b) => {
    const aConn = a.status === "connected" ? 0 : 1
    const bConn = b.status === "connected" ? 0 : 1
    if (aConn !== bConn) return aConn - bConn
    return b.lastActivityAt - a.lastActivityAt
  })

  return (
    <div
      className={cn(
        "grid gap-3",
        variant === "compact"
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {ordered.map((session) => (
        <SessionTile key={session._id} session={session} now={now} variant={variant} />
      ))}
    </div>
  )
}

interface SessionTileProps {
  session: LiveSession
  now: number
  variant: "full" | "compact"
}

function SessionTile({ session, now, variant }: SessionTileProps) {
  const freshness = classifyFreshness(session, now)
  const spec = FRESHNESS[freshness]

  const lastActivityLabel = timeAgo(session.lastActivityAt, now)
  const connectedLabel = timeAgo(session.connectedAt, now)

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 transition-shadow",
        "ring-1 ring-inset",
        spec.ringClass
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{clientLabel(session)}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            role="img"
            aria-label={spec.label}
            className={cn("size-2.5 rounded-full transition-colors", spec.dotClass)}
          />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {spec.label}
          </span>
        </div>
      </div>

      {/* Last tool */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wrench className="size-3" />
        {session.lastTool ? (
          <code className="font-mono text-foreground">{session.lastTool}</code>
        ) : (
          <span className="italic">No tool calls yet</span>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Activity className="size-3" />
          {session.toolCallCount} call{session.toolCallCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          last {lastActivityLabel}
        </span>
        {variant === "full" && (
          <span className="flex items-center gap-1">
            {session.status === "connected" ? (
              <PlugZap className="size-3" />
            ) : (
              <Plug className="size-3" />
            )}
            {session.status === "connected" ? `up ${connectedLabel}` : session.status}
          </span>
        )}
      </div>

      {/* Footer — agent id (only on full) */}
      {variant === "full" && session.agentId && (
        <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2 text-[11px] font-mono text-muted-foreground">
          <Hash className="size-3" />
          {shortAgentId(session.agentId)}
        </div>
      )}
    </div>
  )
}

function EmptyState({ compact }: { compact: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface text-center",
        compact ? "py-8 px-4" : "py-16 px-6"
      )}
    >
      <Bot className="size-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium">No active agent sessions</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">
        Connect Claude Code, Cursor, or any MCP client and tile widgets will appear here as sessions
        go live.
      </p>
    </div>
  )
}
