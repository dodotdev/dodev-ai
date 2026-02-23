"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Search } from "lucide-react"
import { useState } from "react"
import { IssueForm } from "@/components/dashboard/issue-form"
import { IssueList } from "@/components/dashboard/issue-list"
import { useAuth } from "@/components/providers/auth-provider"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "pending" | "in_progress" | "completed"
type TypeFilter = "all" | "bug" | "feature" | "improvement" | "task"

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "bug", label: "Bugs" },
  { value: "feature", label: "Features" },
  { value: "improvement", label: "Improvements" },
  { value: "task", label: "Tasks" },
]

export default function IssuesPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [search, setSearch] = useState("")

  const issues = useQuery(
    api.issues.list,
    apiKeyHash
      ? {
          apiKeyHash,
          status: statusFilter !== "all" ? statusFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          limit: 50,
        }
      : "skip"
  )

  const createIssue = useMutation(api.issues.create)
  const updateIssue = useMutation(api.issues.update)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleCreate(data: {
    title: string
    description?: string
    type: string
    severity: string
    priority: string
    tags?: string[]
    statusId?: string
    labelIds?: string[]
    assigneeId?: string
    estimate?: string
  }) {
    if (!apiKeyHash) return
    await createIssue({
      apiKeyHash,
      title: data.title,
      description: data.description,
      type: data.type as "bug" | "feature" | "improvement" | "task",
      severity: data.severity as "critical" | "major" | "minor" | "trivial",
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      tags: data.tags,
      statusId: data.statusId,
      labelIds: data.labelIds,
      assigneeId: data.assigneeId,
      estimate: data.estimate,
    })
  }

  async function handleUpdate(id: string, data: { status?: string }) {
    if (!apiKeyHash) return
    await updateIssue({
      apiKeyHash,
      id: id as never,
      status: data.status as "pending" | "in_progress" | "completed" | "cancelled",
    })
  }

  // Client-side search filtering
  const filtered = (issues ?? [])
    .filter((issue) => {
      if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .map((i) => ({
      _id: i._id as string,
      title: i.title,
      description: i.description,
      status: i.status,
      priority: i.priority,
      type: i.type,
      severity: i.severity,
      tags: i.tags,
      dueDate: i.dueDate,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track bugs, features, and improvements
          </p>
        </div>
        <IssueForm onSubmit={handleCreate} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              type="button"
              onClick={() => setStatusFilter(sf.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === sf.value
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {typeFilters.map((tf) => (
          <button
            key={tf.value}
            type="button"
            onClick={() => setTypeFilter(tf.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              typeFilter === tf.value
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:text-muted-foreground"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <IssueList issues={filtered} onUpdate={handleUpdate} />
    </div>
  )
}
