"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Plus } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ItemDetailView } from "@/components/dashboard/item-detail-view"
import { LinearListView, type ListItem } from "@/components/dashboard/linear-list-view"
import { ProjectHeader } from "@/components/dashboard/project-header"
import { SlideView } from "@/components/dashboard/slide-view"
import { TaskForm } from "@/components/dashboard/task-form"
import { useAuth } from "@/components/providers/auth-provider"
import { useUploadAttachments } from "@/hooks/use-upload-attachments"

export default function ProjectTasksPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  const tasks = useQuery(
    api.tasks.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never, limit: 100 } : "skip"
  )

  // Comments query (only when item selected)
  const comments = useQuery(
    api.comments.list,
    selectedItemId && apiKeyHash ? { apiKeyHash, taskId: selectedItemId as never } : "skip"
  )

  const versions = useQuery(
    api.versions.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never } : "skip"
  )

  const updateTask = useMutation(api.tasks.update)
  const createTask = useMutation(api.tasks.create)
  const deleteTask = useMutation(api.tasks.remove)
  const createComment = useMutation(api.comments.create)
  const updateComment = useMutation(api.comments.update)
  const deleteComment = useMutation(api.comments.remove)
  const uploadAttachments = useUploadAttachments(apiKeyHash)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (project === undefined || tasks === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const projectStatuses = project?.statuses ?? []
  const projectLabels = project?.labels ?? []
  const projectMembers = project?.members ?? []

  async function handleStatusChange(taskId: string, newStatus: string, statusId?: string) {
    if (!apiKeyHash) return
    await updateTask({
      apiKeyHash,
      id: taskId as never,
      status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
      ...(statusId ? { statusId } : {}),
    })
  }

  async function handleCreate(data: {
    title: string
    description?: string
    priority: string
    tags?: string[]
    statusId?: string
    labelIds?: string[]
    assigneeId?: string
    estimate?: string
    attachments?: File[]
  }) {
    if (!apiKeyHash) return
    const created = await createTask({
      apiKeyHash,
      title: data.title,
      description: data.description,
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      tags: data.tags,
      projectId: id as never,
      statusId: data.statusId,
      labelIds: data.labelIds,
      assigneeId: data.assigneeId,
      estimate: data.estimate,
    })
    if (data.attachments?.length && created?._id) {
      await uploadAttachments(data.attachments, { taskId: created._id as string })
    }
  }

  async function handleAddComment(body: string) {
    if (!apiKeyHash || !selectedItemId) return
    await createComment({
      apiKeyHash,
      taskId: selectedItemId as never,
      body,
      authorType: "user" as const,
    })
  }

  async function handleUpdateComment(commentId: string, body: string) {
    if (!apiKeyHash) return
    await updateComment({ apiKeyHash, id: commentId as never, body })
  }

  async function handleDeleteComment(commentId: string) {
    if (!apiKeyHash) return
    await deleteComment({ apiKeyHash, id: commentId as never })
  }

  async function handleUpdateItem(updates: Record<string, unknown>) {
    if (!apiKeyHash || !selectedItemId) return
    await updateTask({
      apiKeyHash,
      id: selectedItemId as never,
      ...updates,
    } as never)
  }

  async function handleDeleteItem() {
    if (!apiKeyHash || !selectedItemId) return
    await deleteTask({ apiKeyHash, id: selectedItemId as never })
    setSelectedItemId(null)
  }

  // Resolve labels and assignees for display
  const labelMap = new Map(projectLabels.map((l) => [l.id, l]))
  const memberMap = new Map(projectMembers.map((m) => [m.id, m]))
  const projectSlug = project?.slug

  const mapped: ListItem[] = (tasks ?? []).map((t) => {
    const raw = t as Record<string, unknown>
    const taskNumber = raw.number as number | undefined
    return {
      _id: t._id as string,
      title: t.title,
      description: raw.description as string | undefined,
      status: t.status,
      priority: t.priority,
      tags: (raw.tags as string[]) ?? [],
      dueDate: raw.dueDate as number | undefined,
      number: taskNumber,
      statusId: raw.statusId as string | undefined,
      labelIds: raw.labelIds as string[] | undefined,
      assigneeId: raw.assigneeId as string | undefined,
      estimate: raw.estimate as string | undefined,
      cycleId: raw.cycleId as string | undefined,
      changelog: raw.changelog as boolean | undefined,
      versionId: raw.versionId as string | undefined,
      createdAt: (raw.createdAt ?? raw._creationTime) as number,
      updatedAt: (raw.updatedAt ?? raw._creationTime) as number,
      issueId: projectSlug && taskNumber ? `${projectSlug}-${taskNumber}` : undefined,
      resolvedLabels: (raw.labelIds as string[] | undefined)
        ?.map((lid) => labelMap.get(lid))
        .filter(Boolean) as Array<{ id: string; name: string; color: string }> | undefined,
      resolvedAssignee: raw.assigneeId ? memberMap.get(raw.assigneeId as string) : undefined,
    }
  })

  // Derive selected item from live query data
  const selectedItem = selectedItemId
    ? (mapped.find((i) => i._id === selectedItemId) ?? null)
    : null

  // Navigation
  const currentIndex = selectedItem ? mapped.findIndex((i) => i._id === selectedItem._id) : -1

  function handleNavigate(direction: "prev" | "next") {
    const idx = direction === "prev" ? currentIndex - 1 : currentIndex + 1
    if (idx >= 0 && idx < mapped.length) {
      setSelectedItemId(mapped[idx]._id)
    }
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        title="Tasks"
        actions={
          <TaskForm
            onSubmit={handleCreate}
            projectConfig={{
              statuses: projectStatuses,
              labels: projectLabels,
              members: projectMembers,
              estimateScale: project?.estimateScale,
            }}
            trigger={
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="New task"
              >
                <Plus className="size-4" />
              </button>
            }
          />
        }
      />

      <SlideView
        showDetail={!!selectedItem}
        listContent={
          <LinearListView
            items={mapped}
            statuses={projectStatuses}
            onStatusChange={handleStatusChange}
            onItemClick={(item) => setSelectedItemId(item._id)}
            emptyMessage="No tasks yet. Create one from the MCP server or the form above."
            storageKey={`tasks:${id}`}
          />
        }
        detailContent={
          selectedItem ? (
            <ItemDetailView
              item={selectedItem}
              projectSlug={projectSlug}
              projectConfig={{
                statuses: projectStatuses,
                labels: projectLabels,
                members: projectMembers,
                estimateScale: project?.estimateScale,
              }}
              versions={(versions ?? []).map((v) => ({
                _id: v._id as string,
                name: v.name,
                status: v.status,
                description: v.description,
              }))}
              comments={comments ?? []}
              onBack={() => setSelectedItemId(null)}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
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
