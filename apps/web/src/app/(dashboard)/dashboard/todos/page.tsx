"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Search } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { TodoForm } from "@/components/dashboard/todo-form"
import { TodoList } from "@/components/dashboard/todo-list"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "pending" | "in_progress" | "completed"

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

export default function TodosPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")

  const todos = useQuery(
    api.todos.list,
    apiKeyHash
      ? {
          apiKeyHash,
          status: filter !== "all" ? filter : undefined,
          limit: 50,
        }
      : "skip"
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

  async function handleUpdate(id: string, data: { status?: string }) {
    if (!apiKeyHash) return
    await updateTodo({
      apiKeyHash,
      id: id as never, // Convex ID type
      status: data.status as "pending" | "in_progress" | "completed" | "cancelled",
    })
  }

  // Client-side search filtering
  const filtered = (todos ?? [])
    .filter((todo) => {
      if (search && !todo.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .map((t) => ({
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
          <h1 className="text-2xl font-bold tracking-tight">Todos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AI agent&apos;s task list
          </p>
        </div>
        <TodoForm onSubmit={handleCreate} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search todos..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              type="button"
              onClick={() => setFilter(sf.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === sf.value
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      <TodoList todos={filtered} onUpdate={handleUpdate} />
    </div>
  )
}
