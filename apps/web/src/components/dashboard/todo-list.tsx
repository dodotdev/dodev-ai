"use client"

import { CheckCircle2, Circle, Clock, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatRelativeTime } from "@/lib/utils"

interface TodoItem {
  _id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
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

interface TodoListProps {
  todos: TodoItem[]
  onUpdate?: (id: string, data: Partial<TodoItem>) => void
}

export function TodoList({ todos, onUpdate }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Circle className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No todos yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create one from the MCP server or the form above
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-white dark:bg-card">
      {todos.map((todo) => {
        const StatusIcon = statusIcons[todo.status]
        return (
          <div
            key={todo._id}
            className="flex items-start gap-3 p-4 transition-colors hover:bg-surface-hover"
          >
            <button
              type="button"
              className={cn("mt-0.5 shrink-0", statusColors[todo.status])}
              onClick={() => {
                if (todo.status === "completed") {
                  onUpdate?.(todo._id, { status: "pending" })
                } else {
                  onUpdate?.(todo._id, { status: "completed" })
                }
              }}
              aria-label={todo.status === "completed" ? "Mark as pending" : "Mark as complete"}
            >
              <StatusIcon className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  todo.status === "completed" && "text-muted-foreground line-through"
                )}
              >
                {todo.title}
              </p>
              {todo.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {todo.description}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("text-[10px]", priorityColors[todo.priority])}
                >
                  {todo.priority}
                </Badge>
                {todo.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(todo.updatedAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
