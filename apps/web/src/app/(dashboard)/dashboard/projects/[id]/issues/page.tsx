"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"
import { IssueForm } from "@/components/dashboard/issue-form"
import { LinearListView, type ListItem } from "@/components/dashboard/linear-list-view"
import { useAuth } from "@/components/providers/auth-provider"

export default function ProjectIssuesPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  const issues = useQuery(
    api.issues.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never, limit: 100 } : "skip"
  )

  const updateIssue = useMutation(api.issues.update)
  const createIssue = useMutation(api.issues.create)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (project === undefined || issues === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const projectStatuses = project?.statuses ?? []
  const projectLabels = project?.labels ?? []
  const projectMembers = project?.members ?? []

  async function handleStatusChange(issueId: string, newStatus: string, statusId?: string) {
    if (!apiKeyHash) return
    await updateIssue({
      apiKeyHash,
      id: issueId as never,
      status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
      ...(statusId ? { statusId } : {}),
    })
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
      projectId: id as never,
      statusId: data.statusId,
      labelIds: data.labelIds,
      assigneeId: data.assigneeId,
      estimate: data.estimate,
    })
  }

  // Resolve labels and assignees for display
  const labelMap = new Map(projectLabels.map((l) => [l.id, l]))
  const memberMap = new Map(projectMembers.map((m) => [m.id, m]))
  const projectStub = project?.stub

  const mapped: ListItem[] = (issues ?? []).map((i) => {
    const raw = i as Record<string, unknown>
    const issueNumber = raw.number as number | undefined
    return {
      _id: i._id as string,
      title: i.title,
      description: i.description,
      status: i.status,
      priority: i.priority,
      type: i.type,
      severity: i.severity,
      tags: i.tags,
      dueDate: i.dueDate,
      number: issueNumber,
      statusId: raw.statusId as string | undefined,
      labelIds: raw.labelIds as string[] | undefined,
      assigneeId: raw.assigneeId as string | undefined,
      estimate: raw.estimate as string | undefined,
      cycleId: raw.cycleId as string | undefined,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      issueId: projectStub && issueNumber ? `${projectStub}-${issueNumber}` : undefined,
      resolvedLabels: (raw.labelIds as string[] | undefined)
        ?.map((lid) => labelMap.get(lid))
        .filter(Boolean) as Array<{ id: string; name: string; color: string }> | undefined,
      resolvedAssignee: raw.assigneeId ? memberMap.get(raw.assigneeId as string) : undefined,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track bugs, features, and improvements
          </p>
        </div>
        <IssueForm onSubmit={handleCreate} />
      </div>

      <LinearListView
        items={mapped}
        statuses={projectStatuses}
        onStatusChange={handleStatusChange}
        emptyMessage="No issues yet. Create one from the MCP server or the form above."
      />
    </div>
  )
}
