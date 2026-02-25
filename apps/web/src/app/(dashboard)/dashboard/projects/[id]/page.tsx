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
import { TodoForm } from "@/components/dashboard/todo-form"
import { useAuth } from "@/components/providers/auth-provider"
import { useUploadAttachments } from "@/hooks/use-upload-attachments"

export default function ProjectTodosPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null)

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  const todos = useQuery(
    api.todos.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never, limit: 100 } : "skip"
  )

  // Comments query (only when item selected)
  const comments = useQuery(
    api.comments.list,
    selectedItem && apiKeyHash ? { apiKeyHash, todoId: selectedItem._id as never } : "skip"
  )

  const updateTodo = useMutation(api.todos.update)
  const createTodo = useMutation(api.todos.create)
  const createComment = useMutation(api.comments.create)
  const uploadAttachments = useUploadAttachments(apiKeyHash)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (project === undefined || todos === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const projectStatuses = project?.statuses ?? []
  const projectLabels = project?.labels ?? []
  const projectMembers = project?.members ?? []

  async function handleStatusChange(todoId: string, newStatus: string, statusId?: string) {
    if (!apiKeyHash) return
    await updateTodo({
      apiKeyHash,
      id: todoId as never,
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
    const created = await createTodo({
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
      await uploadAttachments(data.attachments, { todoId: created._id as string })
    }
  }

  async function handleAddComment(body: string) {
    if (!apiKeyHash || !selectedItem) return
    await createComment({
      apiKeyHash,
      todoId: selectedItem._id as never,
      body,
      authorType: "user" as const,
    })
  }

  async function handleUpdateItem(updates: Record<string, unknown>) {
    if (!apiKeyHash || !selectedItem) return
    await updateTodo({
      apiKeyHash,
      id: selectedItem._id as never,
      ...updates,
    } as never)
  }

  // Resolve labels and assignees for display
  const labelMap = new Map(projectLabels.map((l) => [l.id, l]))
  const memberMap = new Map(projectMembers.map((m) => [m.id, m]))
  const projectStub = project?.stub

  const mapped: ListItem[] = (todos ?? []).map((t) => {
    const raw = t as Record<string, unknown>
    const todoNumber = raw.number as number | undefined
    return {
      _id: t._id as string,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      tags: t.tags,
      dueDate: t.dueDate,
      number: todoNumber,
      statusId: raw.statusId as string | undefined,
      labelIds: raw.labelIds as string[] | undefined,
      assigneeId: raw.assigneeId as string | undefined,
      estimate: raw.estimate as string | undefined,
      cycleId: raw.cycleId as string | undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      issueId: projectStub && todoNumber ? `${projectStub}-${todoNumber}` : undefined,
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
        title="Todos"
        actions={
          <TodoForm
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
                title="New todo"
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
            onItemClick={setSelectedItem}
            emptyMessage="No todos yet. Create one from the MCP server or the form above."
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
