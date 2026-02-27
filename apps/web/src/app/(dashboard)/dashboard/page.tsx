"use client"

import { api } from "@dodev/convex/api"
import { useQuery } from "convex/react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  FolderOpen,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { ConnectedAgents } from "@/components/dashboard/overview/connected-agents"
import { LiveAgentFeed } from "@/components/dashboard/overview/live-agent-feed"
import { MetricRibbon } from "@/components/dashboard/overview/metric-ribbon"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { cn, formatRelativeTime } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const priorityBarColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-zinc-300 dark:bg-zinc-600",
}

const statusIcons: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
}

const statusTextColors: Record<string, string> = {
  pending: "text-amber-500 dark:text-amber-400",
  in_progress: "text-blue-500 dark:text-blue-400",
  completed: "text-emerald-500 dark:text-emerald-400",
}

// ---------------------------------------------------------------------------
// Memory type badge helpers
// ---------------------------------------------------------------------------

const memoryTypeColors: Record<string, string> = {
  fact: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  decision: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  learning: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  preference: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  context: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const context = useQuery(api.projects.getContext, apiKeyHash ? { apiKeyHash } : "skip")
  const usage = useQuery(api.usage.getCurrentUsage, apiKeyHash ? { apiKeyHash } : "skip")
  const recentTasks = useQuery(api.tasks.list, apiKeyHash ? { apiKeyHash, limit: 10 } : "skip")
  const mcpLogs = useQuery(api.mcpLogs.list, apiKeyHash ? { apiKeyHash, limit: 25 } : "skip")
  const activeSessions = useQuery(
    api.agentSessions.listActive,
    apiKeyHash ? { apiKeyHash } : "skip"
  )

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Derived data
  const agentCount = (activeSessions as unknown[] | undefined)?.length ?? 0
  const pendingCount = context?.taskSummary?.pending ?? 0
  const inProgressCount = context?.taskSummary?.inProgress ?? 0
  const openIssueCount = usage?.issueCount ?? 0
  const memoryCount = usage?.memoryCount ?? 0
  const agentCallCount = usage?.apiCalls ?? 0
  const hasLogs = mcpLogs && mcpLogs.length > 0

  // Focus items: urgent/high pending tasks, sorted by priority
  const focusItems = (recentTasks ?? [])
    .filter(
      (t) =>
        (t.status === "pending" || t.status === "in_progress") &&
        (t.priority === "urgent" || t.priority === "high")
    )
    .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
    .slice(0, 5)

  // Active project info
  const activeProject = context?.activeProject
  const activeCycle = context?.activeCycle
  const recentMemories = (context?.recentMemories ?? []).slice(0, 3)

  // Task summary numbers
  const completedCount = Math.max(0, (usage?.taskCount ?? 0) - pendingCount - inProgressCount)

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Header with Agent Pulse                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your AI agent workspace at a glance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "relative size-2.5 rounded-full ring-4",
              agentCount > 0
                ? "bg-emerald-500 ring-emerald-500/30 animate-pulse"
                : "bg-zinc-300 ring-transparent dark:bg-zinc-600"
            )}
          />
          {agentCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {agentCount} agent{agentCount !== 1 ? "s" : ""} connected
            </span>
          ) : (
            <Link
              href="/dashboard/settings"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              No agent connected
            </Link>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Metric Ribbon                                                    */}
      {/* ---------------------------------------------------------------- */}
      <MetricRibbon
        inProgress={inProgressCount}
        pending={pendingCount}
        openIssues={openIssueCount}
        memories={memoryCount}
        agentCalls={agentCallCount}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Two-column layout: main + right rail                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ============================================================= */}
        {/* LEFT COLUMN (8/12)                                             */}
        {/* ============================================================= */}
        <div className="space-y-6 lg:col-span-8">
          {/* Live Agent Feed */}
          <LiveAgentFeed logs={mcpLogs} />

          {/* Focus Area - Needs Attention */}
          <div className="rounded-2xl border border-border bg-white dark:bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Needs Attention</h2>
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View All Tasks
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {focusItems.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-8 justify-center">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  All clear -- no urgent or high-priority items
                </span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {focusItems.map((task) => {
                  const StatusIcon = statusIcons[task.status] ?? Circle
                  return (
                    <div
                      key={task._id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                    >
                      {/* Priority color bar */}
                      <div
                        className={cn(
                          "w-1 self-stretch rounded-full shrink-0",
                          priorityBarColors[task.priority]
                        )}
                      />

                      {/* Status icon */}
                      <StatusIcon
                        className={cn("size-4 shrink-0", statusTextColors[task.status])}
                      />

                      {/* Identifier */}
                      {task.number != null && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          #{task.number}
                        </span>
                      )}

                      {/* Title */}
                      <span className="min-w-0 truncate text-sm font-medium">{task.title}</span>

                      {/* Spacer */}
                      <span className="flex-1" />

                      {/* Priority badge */}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] shrink-0",
                          task.priority === "urgent"
                            ? "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                        )}
                      >
                        {task.priority}
                      </Badge>

                      {/* Time */}
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(
                          ((task as Record<string, unknown>).updatedAt ??
                            (task as Record<string, unknown>)._creationTime) as number
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* RIGHT RAIL (4/12)                                              */}
        {/* ============================================================= */}
        <div className="space-y-6 lg:col-span-4">
          {/* Connected Agents */}
          <ConnectedAgents />

          {/* Active Project Card */}
          {activeProject ? (
            <ActiveProjectCard
              project={activeProject}
              pending={pendingCount}
              inProgress={inProgressCount}
              completed={completedCount}
              cycle={activeCycle}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderOpen className="size-4" />
                <span className="text-sm font-medium">No Active Project</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Create a project or set one as active via the MCP server.
              </p>
              <Link
                href="/dashboard/projects"
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Go to Projects
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}

          {/* Memory Digest */}
          <MemoryDigest memories={recentMemories} totalCount={memoryCount} />

          {/* Setup Card (conditional) */}
          {!hasLogs && <SetupCard />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active Project Card
// ---------------------------------------------------------------------------

function ActiveProjectCard({
  project,
  pending,
  inProgress,
  completed,
  cycle,
}: {
  project: {
    _id: string
    name: string
    slug?: string
    description?: string
  }
  pending: number
  inProgress: number
  completed: number
  cycle?: {
    name: string
    status: string
    endDate: number
  } | null
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{project.name}</h3>
          {project.slug && (
            <Badge variant="secondary" className="mt-1 text-[10px] font-mono">
              {project.slug}
            </Badge>
          )}
        </div>
        <Link
          href={`/dashboard/projects/${project._id}`}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open
          <ArrowRight className="ml-0.5 inline size-3" />
        </Link>
      </div>

      {project.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
      )}

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-amber-50 px-2 py-2 dark:bg-amber-500/10">
          <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {pending}
          </p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-2 dark:bg-blue-500/10">
          <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {inProgress}
          </p>
          <p className="text-[10px] text-muted-foreground">In Progress</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-2 dark:bg-emerald-500/10">
          <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {completed}
          </p>
          <p className="text-[10px] text-muted-foreground">Done</p>
        </div>
      </div>

      {/* Active cycle */}
      {cycle && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-medium truncate">{cycle.name}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            ends {formatRelativeTime(cycle.endDate)}
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Memory Digest
// ---------------------------------------------------------------------------

function MemoryDigest({
  memories,
  totalCount,
}: {
  memories: Array<{
    _id: string
    content: string
    type?: string
    createdAt: number
  }>
  totalCount: number
}) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Recent Memories</h3>
          {totalCount > 0 && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              {totalCount}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/memories"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View All
        </Link>
      </div>

      {memories.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            No memories stored yet. AI agents will save learnings, decisions, and facts here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {memories.map((m) => (
            <div key={m._id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                {m.type && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      memoryTypeColors[m.type] ?? memoryTypeColors.context
                    )}
                  >
                    {m.type}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatRelativeTime(m.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {m.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Setup Card
// ---------------------------------------------------------------------------

function SetupCard() {
  const [copied, setCopied] = useState(false)

  const configSnippet = `{
  "mcpServers": {
    "dodev": {
      "command": "npx",
      "args": ["-y", "@dodev/mcp-server@latest"]
    }
  }
}`

  function handleCopy() {
    navigator.clipboard.writeText(configSnippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-5 dark:bg-card">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Connect Claude Code</h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        Add dodev.ai to your MCP client to start tracking tasks, memories, and issues from your AI
        agent sessions.
      </p>

      <div className="relative mt-3">
        <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-300 font-mono leading-relaxed">
          {configSnippet}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Copy MCP configuration"
        >
          {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>

      <Link
        href="/dashboard/settings"
        className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        View API Key & Settings
        <ArrowRight className="size-3" />
      </Link>
    </div>
  )
}
