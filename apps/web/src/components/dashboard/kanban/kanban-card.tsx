"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { cn, formatRelativeTime } from "@/lib/utils"

interface ResolvedLabel {
  id: string
  name: string
  color: string
}

interface ResolvedAssignee {
  id: string
  name: string
  avatarUrl?: string
}

export interface KanbanTask {
  _id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  type?: "bug" | "feature" | "improvement" | "task"
  severity?: "critical" | "major" | "minor" | "trivial"
  tags: string[]
  dueDate?: number
  number?: number
  statusId?: string
  labelIds?: string[]
  assigneeId?: string
  estimate?: string
  cycleId?: string
  createdAt: number
  updatedAt: number
  // Resolved from space config for display
  issueId?: string
  resolvedLabels?: ResolvedLabel[]
  resolvedAssignee?: ResolvedAssignee
}

const priorityColors = {
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  medium: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  urgent: "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300",
}

const typeColors: Record<string, string> = {
  bug: "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  feature: "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  improvement: "bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  task: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
}

const severityColors: Record<string, string> = {
  critical: "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  major: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  minor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  trivial: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
}

interface KanbanCardProps {
  task: KanbanTask
  isDragOverlay?: boolean
}

export function KanbanCard({ task, isDragOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const initials = task.resolvedAssignee?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-white p-3 shadow-sm transition-all dark:bg-card",
        isDragging && "opacity-50 border-dashed",
        isDragOverlay && "shadow-xl scale-105 rotate-2"
      )}
    >
      {task.issueId && (
        <p className="mb-1 font-mono text-[10px] font-medium text-muted-foreground">
          {task.issueId}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-sm font-medium leading-snug flex-1",
            task.status === "completed" && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.resolvedAssignee && (
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            title={task.resolvedAssignee.name}
          >
            {initials}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}
        >
          {task.priority}
        </Badge>

        {task.type && (
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0", typeColors[task.type])}
          >
            {task.type}
          </Badge>
        )}

        {task.severity && (
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0", severityColors[task.severity])}
          >
            {task.severity}
          </Badge>
        )}

        {task.estimate && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
            {task.estimate}
          </Badge>
        )}

        {task.resolvedLabels?.map((label) => (
          <Badge key={label.id} variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
          </Badge>
        ))}

        {task.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">{formatRelativeTime(task.updatedAt)}</p>
    </div>
  )
}
