"use client"

import {
  AlertCircle,
  Brain,
  CircleDot,
  Loader2,
  Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricRibbonProps {
  inProgress: number
  pending: number
  openIssues: number
  memories: number
  agentCalls: number
}

const metrics = [
  {
    key: "inProgress" as const,
    label: "In Progress",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "pending" as const,
    label: "Pending",
    icon: CircleDot,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    key: "openIssues" as const,
    label: "Open Issues",
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    key: "memories" as const,
    label: "Memories",
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    key: "agentCalls" as const,
    label: "Agent Calls",
    icon: Terminal,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
]

export function MetricRibbon({
  inProgress,
  pending,
  openIssues,
  memories,
  agentCalls,
}: MetricRibbonProps) {
  const values: Record<string, number> = {
    inProgress,
    pending,
    openIssues,
    memories,
    agentCalls,
  }

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card">
      <div className="flex flex-wrap divide-y divide-border sm:flex-nowrap sm:divide-x sm:divide-y-0">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div
              key={m.key}
              className="flex flex-1 items-center gap-3 px-4 py-3 min-w-[140px]"
            >
              <div className={cn("rounded-lg p-1.5", m.bg)}>
                <Icon className={cn("size-4", m.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums leading-none">
                  {values[m.key]}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {m.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
