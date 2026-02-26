"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { IssueForm } from "@/components/dashboard/issue-form"
import { LinearListView, type ListItem } from "@/components/dashboard/linear-list-view"
import { useAuth } from "@/components/providers/auth-provider"
import { useUploadAttachments } from "@/hooks/use-upload-attachments"

export default function IssuesPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const issues = useQuery(
    api.issues.list,
    apiKeyHash ? { apiKeyHash, globalOnly: true, limit: 100 } : "skip"
  )

  const createIssue = useMutation(api.issues.create)
  const updateIssue = useMutation(api.issues.update)
  const uploadAttachments = useUploadAttachments(apiKeyHash)

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
    attachments?: File[]
  }) {
    if (!apiKeyHash) return
    const created = await createIssue({
      apiKeyHash,
      title: data.title,
      description: data.description,
      type: data.type as "bug" | "feature" | "improvement" | "task",
      severity: data.severity as "critical" | "major" | "minor" | "trivial",
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      tags: data.tags,
    })
    if (data.attachments?.length && created?._id) {
      await uploadAttachments(data.attachments, { issueId: created._id as string })
    }
  }

  async function handleStatusChange(issueId: string, newStatus: string) {
    if (!apiKeyHash) return
    await updateIssue({
      apiKeyHash,
      id: issueId as never,
      status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
    })
  }

  const mapped: ListItem[] = (issues ?? []).map((i) => {
    const doc = i as Record<string, unknown>
    return {
      _id: i._id as string,
      title: i.title,
      description: doc.description as string | undefined,
      status: i.status,
      priority: i.priority,
      type: i.type,
      severity: i.severity,
      tags: (doc.tags as string[]) ?? [],
      dueDate: doc.dueDate as number | undefined,
      createdAt: (doc.createdAt ?? doc._creationTime) as number,
      updatedAt: (doc.updatedAt ?? doc._creationTime) as number,
    }
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Global issues not scoped to any project
          </p>
        </div>
        <IssueForm onSubmit={handleCreate} />
      </div>

      <LinearListView
        items={mapped}
        onStatusChange={handleStatusChange}
        emptyMessage="No global issues yet. Create one from the MCP server or the form above."
        storageKey="global-issues"
      />
    </div>
  )
}
