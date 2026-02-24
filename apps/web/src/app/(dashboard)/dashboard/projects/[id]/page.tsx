"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Plus } from "lucide-react"
import { useParams } from "next/navigation"
import { KanbanBoard } from "@/components/dashboard/kanban/kanban-board"
import { TodoForm } from "@/components/dashboard/todo-form"
import { useAuth } from "@/components/providers/auth-provider"

export default function ProjectKanbanPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  const todos = useQuery(
    api.todos.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never, limit: 100 } : "skip"
  )

  const updateTodo = useMutation(api.todos.update)
  const createTodo = useMutation(api.todos.create)

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

  async function handleQuickAdd(title: string, status: string, statusId?: string) {
    if (!apiKeyHash) return
    await createTodo({
      apiKeyHash,
      title,
      projectId: id as never,
      ...(statusId ? { statusId } : {}),
      ...(status !== "pending" && !statusId ? { status: status as never } : {}),
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
  }) {
    if (!apiKeyHash) return
    await createTodo({
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
  }

  // Resolve labels and assignees for display on kanban cards
  const labelMap = new Map(projectLabels.map((l) => [l.id, l]))
  const memberMap = new Map(projectMembers.map((m) => [m.id, m]))
  const projectStub = project?.stub

  const mapped = (todos ?? []).map((t) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Todos</h1>
        </div>
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
      </div>

      <KanbanBoard
        todos={mapped}
        statuses={projectStatuses}
        onStatusChange={handleStatusChange}
        onQuickAdd={handleQuickAdd}
      />
    </div>
  )
}
