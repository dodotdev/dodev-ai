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

interface ProjectItem {
  _id: string
  name: string
  description?: string
  status: "active" | "paused" | "completed" | "archived"
  createdAt: number
  updatedAt: number
  stats?: {
    totalTodos: number
    pendingTodos: number
    inProgressTodos: number
    completedTodos: number
    memoryCount: number
  }
}

const statusColors = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
}

interface ProjectCardsProps {
  projects: ProjectItem[]
  onArchive?: (id: string) => void
}

export function ProjectCards({ projects, onArchive }: ProjectCardsProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No projects yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create a project to organize your work</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project._id}
          href={`/dashboard/projects/${project._id}`}
          className="group rounded-2xl border border-border bg-white p-5 transition-colors hover:bg-surface dark:bg-card dark:hover:bg-accent"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{project.name}</h3>
              {project.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {project.description}
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
                    onArchive?.(project._id)
                  }}
                >
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3">
            <Badge variant="secondary" className={statusColors[project.status]}>
              {project.status}
            </Badge>
          </div>

          {project.stats && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckSquare className="size-3" />
                <span>
                  {project.stats.completedTodos}/{project.stats.totalTodos} todos
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Brain className="size-3" />
                <span>{project.stats.memoryCount} memories</span>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Updated {formatRelativeTime(project.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  )
}
