"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { LinearListView, type ListItem } from "@/components/dashboard/linear-list-view"
import { TodoForm } from "@/components/dashboard/todo-form"
import { useAuth } from "@/components/providers/auth-provider"

export default function TodosPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const todos = useQuery(
    api.todos.list,
    apiKeyHash ? { apiKeyHash, globalOnly: true, limit: 100 } : "skip"
  )

  const createTodo = useMutation(api.todos.create)
  const updateTodo = useMutation(api.todos.update)

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
  }) {
    if (!apiKeyHash) return
    await createTodo({
      apiKeyHash,
      title: data.title,
      description: data.description,
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      tags: data.tags,
    })
  }

  async function handleStatusChange(todoId: string, newStatus: string) {
    if (!apiKeyHash) return
    await updateTodo({
      apiKeyHash,
      id: todoId as never,
      status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
    })
  }

  const mapped: ListItem[] = (todos ?? []).map((t) => ({
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Todos</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Global todos not scoped to any project
          </p>
        </div>
        <TodoForm onSubmit={handleCreate} />
      </div>

      <LinearListView
        items={mapped}
        onStatusChange={handleStatusChange}
        emptyMessage="No global todos yet. Create one from the MCP server or the form above."
      />
    </div>
  )
}
