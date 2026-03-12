"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { SpaceCards } from "@/components/dashboard/space-cards"
import { SpaceForm } from "@/components/dashboard/space-form"
import { useAuth } from "@/components/providers/auth-provider"

export default function SpacesPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const spaces = useQuery(api.spaces.list, apiKeyHash ? { apiKeyHash, includeStats: true } : "skip")

  const createSpace = useMutation(api.spaces.create)
  const archiveSpace = useMutation(api.spaces.archive)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleCreate(data: { name: string; slug?: string; description?: string }) {
    if (!apiKeyHash) return
    await createSpace({
      apiKeyHash,
      name: data.name,
      slug: data.slug,
      description: data.description,
    })
  }

  async function handleArchive(id: string) {
    if (!apiKeyHash) return
    await archiveSpace({
      apiKeyHash,
      id: id as never, // Convex ID type
    })
  }

  const mapped = (spaces ?? []).map((s) => ({
    _id: s._id as string,
    name: s.name,
    description: s.description,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    stats:
      "stats" in s
        ? (
            s as {
              stats: {
                totalTasks: number
                pendingTasks: number
                inProgressTasks: number
                completedTasks: number
                memoryCount: number
              }
            }
          ).stats
        : undefined,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize work by space context</p>
        </div>
        <SpaceForm onSubmit={handleCreate} />
      </div>

      <SpaceCards spaces={mapped} onArchive={handleArchive} />
    </div>
  )
}
