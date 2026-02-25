"use client"

import { api } from "@dodev/convex/api"
import { useQuery } from "convex/react"
import { ArrowRight, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { TaskList } from "@/components/dashboard/task-list"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const context = useQuery(api.projects.getContext, apiKeyHash ? { apiKeyHash } : "skip")
  const usage = useQuery(api.usage.getCurrentUsage, apiKeyHash ? { apiKeyHash } : "skip")
  const recentTasks = useQuery(api.tasks.list, apiKeyHash ? { apiKeyHash, limit: 4 } : "skip")

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stats = {
    totalTasks: usage?.taskCount ?? 0,
    pendingTasks: context?.taskSummary?.pending ?? 0,
    inProgressTasks: context?.taskSummary?.inProgress ?? 0,
    completedTasks: Math.max(
      0,
      (usage?.taskCount ?? 0) -
        (context?.taskSummary?.pending ?? 0) -
        (context?.taskSummary?.inProgress ?? 0)
    ),
    totalMemories: usage?.memoryCount ?? 0,
    totalProjects: usage?.projectCount ?? 0,
  }

  const tasks = (recentTasks ?? []).map((t) => ({
    _id: t._id as string,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    tags: t.tags,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI agent&apos;s task and memory summary
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent tasks */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Tasks</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/tasks">
                View All
                <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
          <TaskList tasks={tasks} />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/issues">
                <Plus className="mr-2 size-4" />
                New Issue
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/tasks">
                <Plus className="mr-2 size-4" />
                New Task
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/memories">
                <Plus className="mr-2 size-4" />
                New Memory
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/projects">
                <Plus className="mr-2 size-4" />
                New Project
              </Link>
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-4 dark:bg-card">
            <h3 className="text-sm font-medium">Connect Your AI Agent</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Add dodev.ai to your Claude Code config to start syncing tasks and memories.
            </p>
            <Button variant="ghost" size="sm" className="mt-3 text-xs" asChild>
              <Link href="/dashboard/settings">
                View API Key
                <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
