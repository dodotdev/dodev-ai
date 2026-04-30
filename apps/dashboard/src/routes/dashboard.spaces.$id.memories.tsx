import { api } from "@dodev/convex/api"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Search } from "lucide-react"
import { useState } from "react"
import { MemoryDigestPanel } from "@/components/dashboard/memory-digest/memory-digest-panel"
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

export const Route = createFileRoute("/dashboard/spaces/$id/memories")({
  component: SpaceMemoriesRoute,
})

function SpaceMemoriesRoute() {
  const { id } = useParams({ from: "/dashboard/spaces/$id/memories" })
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const typeArg = typeFilter !== "all" ? typeFilter : undefined

  const searchResults = useQuery(
    api.memories.search,
    apiKeyHash && search.length >= 2
      ? { apiKeyHash, query: search, spaceId: id as never, type: typeArg as never }
      : "skip"
  )

  const allMemories = useQuery(
    api.memories.listMemories,
    apiKeyHash && search.length < 2
      ? { apiKeyHash, spaceId: id as never, type: typeArg as never }
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
      type: data.type as never,
      importance: data.importance,
      spaceId: id as never,
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
            Context and decisions scoped to this space
          </p>
        </div>
        <MemoryForm onSubmit={handleCreate} />
      </div>

      <MemoryDigestPanel spaceId={id} limit={10} />

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
