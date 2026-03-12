"use client"

import { Brain, CheckSquare, FolderOpen, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRelativeTime } from "@/lib/utils"

interface SpaceItem {
  _id: string
  name: string
  description?: string
  status: "active" | "paused" | "completed" | "archived"
  createdAt: number
  updatedAt: number
  stats?: {
    totalTasks: number
    pendingTasks: number
    inProgressTasks: number
    completedTasks: number
    memoryCount: number
  }
}

const statusColors = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
}

interface SpaceCardsProps {
  spaces: SpaceItem[]
  onArchive?: (id: string) => void
}

export function SpaceCards({ spaces, onArchive }: SpaceCardsProps) {
  if (spaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No spaces yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create a space to organize your work</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {spaces.map((space) => (
        <Link
          key={space._id}
          href={`/dashboard/spaces/${space._id}`}
          className="group rounded-2xl border border-border bg-white p-5 transition-colors hover:bg-surface dark:bg-card dark:hover:bg-accent"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{space.name}</h3>
              {space.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {space.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    onArchive?.(space._id)
                  }}
                >
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3">
            <Badge variant="secondary" className={statusColors[space.status]}>
              {space.status}
            </Badge>
          </div>

          {space.stats && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckSquare className="size-3" />
                <span>
                  {space.stats.completedTasks}/{space.stats.totalTasks} tasks
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Brain className="size-3" />
                <span>{space.stats.memoryCount} memories</span>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Updated {formatRelativeTime(space.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  )
}
