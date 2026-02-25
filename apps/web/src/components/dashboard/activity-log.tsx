"use client"

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface McpLog {
  _id: string
  tool: string
  args?: Record<string, unknown>
  status: "ok" | "error"
  errorCode?: string
  errorMessage?: string
  durationMs: number
  projectId?: string
  createdAt: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

function toolCategory(tool: string): string {
  if (
    tool.startsWith("create_todo") ||
    tool.startsWith("update_todo") ||
    tool.startsWith("complete_todo") ||
    tool.startsWith("list_todo") ||
    tool.startsWith("get_todo") ||
    tool.startsWith("delete_todo")
  )
    return "todo"
  if (tool.includes("issue")) return "issue"
  if (tool.includes("memory") || tool === "add_memory" || tool === "search_memories")
    return "memory"
  if (tool.includes("project") || tool.includes("archive_project")) return "project"
  if (tool.includes("cycle")) return "cycle"
  if (tool.includes("context") || tool === "get_context" || tool === "get_setup_instructions")
    return "context"
  if (tool.includes("link") || tool.includes("unlink")) return "linking"
  return "config"
}

const categoryColors: Record<string, string> = {
  todo: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  issue: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  memory: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  project: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cycle: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  context: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  linking: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  config: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

type StatusFilter = "all" | "ok" | "error"

interface ActivityLogProps {
  logs: McpLog[] | undefined
}

export function ActivityLog({ logs }: ActivityLogProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = (logs ?? []).filter((log) => {
    if (statusFilter === "all") return true
    return log.status === statusFilter
  })

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {(["all", "ok", "error"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize",
              statusFilter === f
                ? "bg-white text-foreground shadow-sm dark:bg-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {logs?.length === 0
              ? "No activity yet. Tool calls from AI agents will appear here."
              : "No matching logs."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((log) => {
            const cat = toolCategory(log.tool)
            const isExpanded = expandedId === log._id

            return (
              <button
                key={log._id}
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : log._id)}
                className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  {log.status === "ok" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-red-500" />
                  )}

                  {/* Tool name */}
                  <code className="text-sm font-medium">{log.tool}</code>

                  {/* Category badge */}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      categoryColors[cat]
                    )}
                  >
                    {cat}
                  </span>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Duration */}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {log.durationMs}ms
                  </span>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>

                {/* Error message */}
                {log.status === "error" && log.errorMessage && (
                  <p className="mt-1.5 ml-7 text-xs text-red-500 truncate">
                    {log.errorCode}: {log.errorMessage}
                  </p>
                )}

                {/* Expanded args */}
                {isExpanded && log.args && Object.keys(log.args).length > 0 && (
                  <pre className="mt-2 ml-7 overflow-x-auto rounded bg-muted/50 p-2 text-[11px] text-muted-foreground">
                    {JSON.stringify(log.args, null, 2)}
                  </pre>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
