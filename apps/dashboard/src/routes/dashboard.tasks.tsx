import { api } from "@dodev/convex/api"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { LinearListView, type ListItem } from "@/components/dashboard/linear-list-view"
import { TaskForm } from "@/components/dashboard/task-form"
import { useAuth } from "@/components/providers/auth-provider"
import { useUploadAttachments } from "@/hooks/use-upload-attachments"

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksRoute,
})

function TasksRoute() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const tasks = useQuery(
    api.tasks.list,
    apiKeyHash ? { apiKeyHash, globalOnly: true, limit: 100 } : "skip"
  )

  const createTask = useMutation(api.tasks.create)
  const updateTask = useMutation(api.tasks.update)
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
    priority: string
    tags?: string[]
    attachments?: File[]
  }) {
    if (!apiKeyHash) return
    const created = await createTask({
      apiKeyHash,
      title: data.title,
      description: data.description,
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      tags: data.tags,
    })
    if (data.attachments?.length && created?._id) {
      await uploadAttachments(data.attachments, { taskId: created._id as string })
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (!apiKeyHash) return
    await updateTask({
      apiKeyHash,
      id: taskId as never,
      status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
    })
  }

  const mapped: ListItem[] = (tasks ?? []).map((t) => {
    const doc = t as Record<string, unknown>
    return {
      _id: t._id as string,
      title: t.title,
      description: doc.description as string | undefined,
      status: t.status,
      priority: t.priority,
      tags: (doc.tags as string[]) ?? [],
      dueDate: doc.dueDate as number | undefined,
      createdAt: (doc.createdAt ?? doc._creationTime) as number,
      updatedAt: (doc.updatedAt ?? doc._creationTime) as number,
    }
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Global tasks not scoped to any space
          </p>
        </div>
        <TaskForm onSubmit={handleCreate} />
      </div>

      <LinearListView
        items={mapped}
        onStatusChange={handleStatusChange}
        emptyMessage="No global tasks yet. Create one from the MCP server or the form above."
        storageKey="global-tasks"
      />
    </div>
  )
}
