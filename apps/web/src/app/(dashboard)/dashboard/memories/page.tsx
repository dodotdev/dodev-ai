"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2, Search } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { MemoryForm } from "@/components/dashboard/memory-form"
import { MemoryGrid } from "@/components/dashboard/memory-grid"
import { Input } from "@/components/ui/input"

export default function MemoriesPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [search, setSearch] = useState("")

  // Use search query when there's a search term, otherwise list all
  const searchResults = useQuery(
    api.memories.search,
    apiKeyHash && search.length >= 2 ? { apiKeyHash, query: search } : "skip"
  )

  const allMemories = useQuery(
    api.memories.listMemories,
    apiKeyHash && search.length < 2 ? { apiKeyHash } : "skip"
  )

  const addMemory = useMutation(api.memories.add)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleCreate(data: { content: string; tags?: string[]; source?: string }) {
    if (!apiKeyHash) return
    await addMemory({
      apiKeyHash,
      content: data.content,
      tags: data.tags,
      source: data.source || "web-dashboard",
    })
  }

  const memories = (search.length >= 2 ? searchResults : allMemories) ?? []
  const mapped = memories.map((m) => ({
    _id: m._id as string,
    content: m.content,
    summary: m.summary,
    tags: m.tags,
    source: m.source,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Context and decisions your AI agent can recall
          </p>
        </div>
        <MemoryForm onSubmit={handleCreate} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="pl-10"
        />
      </div>

      <MemoryGrid memories={mapped} />
    </div>
  )
}
