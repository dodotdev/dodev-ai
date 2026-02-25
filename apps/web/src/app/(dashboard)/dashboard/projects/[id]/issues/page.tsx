"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { IssueForm } from "@/components/dashboard/issue-form"
import { ItemDetailView } from "@/components/dashboard/item-detail-view"
import { LinearListView, type ListItem } from "@/components/dashboard/linear-list-view"
import { ProjectHeader } from "@/components/dashboard/project-header"
import { SlideView } from "@/components/dashboard/slide-view"
import { useAuth } from "@/components/providers/auth-provider"
import { useUploadAttachments } from "@/hooks/use-upload-attachments"

export default function ProjectIssuesPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null)

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  const issues = useQuery(
    api.issues.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never, limit: 100 } : "skip"
  )

  // Comments query (only when item selected)
  const comments = useQuery(
    api.comments.list,
    selectedItem && apiKeyHash ? { apiKeyHash, issueId: selectedItem._id as never } : "skip"
  )

  const updateIssue = useMutation(api.issues.update)
  const createIssue = useMutation(api.issues.create)
  const createComment = useMutation(api.comments.create)
  const uploadAttachments = useUploadAttachments(apiKeyHash)

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
      projectId: id as never,
      statusId: data.statusId,
      labelIds: data.labelIds,
      assigneeId: data.assigneeId,
      estimate: data.estimate,
    })
    if (data.attachments?.length && created?._id) {
      await uploadAttachments(data.attachments, { issueId: created._id as string })
    }
  }

  async function handleAddComment(body: string) {
    if (!apiKeyHash || !selectedItem) return
    await createComment({
      apiKeyHash,
      issueId: selectedItem._id as never,
      body,
      authorType: "user" as const,
    })
  }

  async function handleUpdateItem(updates: Record<string, unknown>) {
    if (!apiKeyHash || !selectedItem) return
    await updateIssue({
      apiKeyHash,
      id: selectedItem._id as never,
      ...updates,
    } as never)
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

  // Navigation
  const currentIndex = selectedItem ? mapped.findIndex((i) => i._id === selectedItem._id) : -1

  function handleNavigate(direction: "prev" | "next") {
    const idx = direction === "prev" ? currentIndex - 1 : currentIndex + 1
    if (idx >= 0 && idx < mapped.length) {
      setSelectedItem(mapped[idx])
    }
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        title="Issues"
        actions={<IssueForm onSubmit={handleCreate} />}
      />

      <SlideView
        showDetail={!!selectedItem}
        listContent={
          <LinearListView
            items={mapped}
            statuses={projectStatuses}
            onStatusChange={handleStatusChange}
            onItemClick={setSelectedItem}
            emptyMessage="No issues yet. Create one from the MCP server or the form above."
          />
        }
        detailContent={
          selectedItem ? (
            <ItemDetailView
              item={selectedItem}
              projectStub={projectStub}
              projectConfig={{
                statuses: projectStatuses,
                labels: projectLabels,
                members: projectMembers,
                estimateScale: project?.estimateScale,
              }}
              comments={comments ?? []}
              onBack={() => setSelectedItem(null)}
              onAddComment={handleAddComment}
              onUpdateItem={handleUpdateItem}
              currentIndex={currentIndex}
              totalItems={mapped.length}
              onNavigate={handleNavigate}
            />
          ) : null
        }
      />
    </div>
  )
}
