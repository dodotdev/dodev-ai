"use client"

import { Brain, CheckSquare, Clock, FolderOpen, Loader2 } from "lucide-react"

interface StatsCardsProps {
  stats: {
    totalTodos: number
    pendingTodos: number
    inProgressTodos: number
    completedTodos: number
    totalMemories: number
    totalProjects: number
  }
}

const cards = [
  {
    key: "totalTodos",
    label: "Total Todos",
    icon: CheckSquare,
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    color: "text-emerald-600",
  },
  {
    key: "pendingTodos",
    label: "Pending",
    icon: Clock,
    bg: "bg-amber-50 dark:bg-amber-500/10",
    color: "text-amber-600",
  },
  {
    key: "inProgressTodos",
    label: "In Progress",
    icon: Loader2,
    bg: "bg-blue-50 dark:bg-blue-500/10",
    color: "text-blue-600",
  },
  {
    key: "completedTodos",
    label: "Completed",
    icon: CheckSquare,
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    color: "text-emerald-600",
  },
  {
    key: "totalMemories",
    label: "Memories",
    icon: Brain,
    bg: "bg-purple-50 dark:bg-purple-500/10",
    color: "text-purple-600",
  },
  {
    key: "totalProjects",
    label: "Projects",
    icon: FolderOpen,
    bg: "bg-orange-50 dark:bg-orange-500/10",
    color: "text-orange-600",
  },
] as const

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon
        const value = stats[card.key as keyof typeof stats]

        return (
          <div
            key={card.key}
            className="rounded-2xl border border-border bg-white p-5 dark:bg-card"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`size-4 ${card.color}`} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
          </div>
        )
      })}
    </div>
  )
}
