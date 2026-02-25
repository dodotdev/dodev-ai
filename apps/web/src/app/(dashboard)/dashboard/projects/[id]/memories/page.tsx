"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Search } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { MemoryForm } from "@/components/dashboard/memory-form"
import { MemoryGrid } from "@/components/dashboard/memory-grid"
import { useAuth } from "@/components/providers/auth-provider"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MEMORY_TYPES = [
  { value: "all", label: "All types" },
  { value: "fact", label: "Fact" },
  { value: "decision", label: "Decision" },
  { value: "preference", label: "Preference" },
  { value: "context", label: "Context" },
  { value: "learning", label: "Learning" },
] as const

export default function ProjectMemoriesPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const typeArg = typeFilter !== "all" ? typeFilter : undefined

  const searchResults = useQuery(
    api.memories.search,
    apiKeyHash && search.length >= 2
      ? { apiKeyHash, query: search, projectId: id as never, type: typeArg as any }
      : "skip"
  )

  const allMemories = useQuery(
    api.memories.listMemories,
    apiKeyHash && search.length < 2
      ? { apiKeyHash, projectId: id as never, type: typeArg as any }
      : "skip"
  )

  const addMemory = useMutation(api.memories.add)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleCreate(data: {
    content: string
    tags?: string[]
    source?: string
    type?: string
    importance?: number
  }) {
    if (!apiKeyHash) return
    await addMemory({
      apiKeyHash,
      content: data.content,
      tags: data.tags,
      source: data.source || "web-dashboard",
      type: data.type as any,
      importance: data.importance,
      projectId: id as never,
    })
  }

  const memories = (search.length >= 2 ? searchResults : allMemories) ?? []
  const mapped = memories.map((m) => ({
    _id: m._id as string,
    content: m.content,
    summary: m.summary,
    tags: m.tags,
    source: m.source,
    type: m.type,
    importance: m.importance,
    embedding: m.embedding,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Memories</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Context and decisions scoped to this project
          </p>
        </div>
        <MemoryForm onSubmit={handleCreate} />
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MemoryGrid memories={mapped} />
    </div>
  )
}
