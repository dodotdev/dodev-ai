"use client"

import { CheckCircle2, Circle, Clock, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatRelativeTime } from "@/lib/utils"

interface IssueItem {
  _id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  type: "bug" | "feature" | "improvement" | "task"
  severity: "critical" | "major" | "minor" | "trivial"
  tags: string[]
  dueDate?: number
  createdAt: number
  updatedAt: number
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: X,
}

const statusColors = {
  pending: "text-amber-500 dark:text-amber-400",
  in_progress: "text-blue-500 dark:text-cyan-400",
  completed: "text-emerald-500 dark:text-emerald-400",
  cancelled: "text-zinc-400 dark:text-red-400",
}

const priorityColors = {
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  medium: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  urgent: "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300",
}

const typeColors = {
  bug: "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  feature: "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  improvement: "bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  task: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
}

const severityColors = {
  critical: "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  major: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  minor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  trivial: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
}

interface IssueListProps {
  issues: IssueItem[]
  onUpdate?: (id: string, data: Partial<IssueItem>) => void
}

export function IssueList({ issues, onUpdate }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Circle className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No issues yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create one from the MCP server or the form above
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-white dark:bg-card">
      {issues.map((issue) => {
        const StatusIcon = statusIcons[issue.status]
        return (
          <div
            key={issue._id}
            className="flex items-start gap-3 p-4 transition-colors hover:bg-surface-hover"
          >
            <button
              type="button"
              className={cn("mt-0.5 shrink-0", statusColors[issue.status])}
              onClick={() => {
                if (issue.status === "completed") {
                  onUpdate?.(issue._id, { status: "pending" })
                } else {
                  onUpdate?.(issue._id, { status: "completed" })
                }
              }}
              aria-label={issue.status === "completed" ? "Reopen issue" : "Close issue"}
            >
              <StatusIcon className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  issue.status === "completed" && "text-muted-foreground line-through"
                )}
              >
                {issue.title}
              </p>
              {issue.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {issue.description}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={cn("text-[10px]", typeColors[issue.type])}>
                  {issue.type}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("text-[10px]", severityColors[issue.severity])}
                >
                  {issue.severity}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("text-[10px]", priorityColors[issue.priority])}
                >
                  {issue.priority}
                </Badge>
                {issue.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(issue.updatedAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
