"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { ProjectCards } from "@/components/dashboard/project-cards"
import { ProjectForm } from "@/components/dashboard/project-form"
import { useAuth } from "@/components/providers/auth-provider"

export default function ProjectsPage() {
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const projects = useQuery(
    api.projects.list,
    apiKeyHash ? { apiKeyHash, includeStats: true } : "skip"
  )

  const createProject = useMutation(api.projects.create)
  const archiveProject = useMutation(api.projects.archive)

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleCreate(data: { name: string; slug?: string; description?: string }) {
    if (!apiKeyHash) return
    await createProject({
      apiKeyHash,
      name: data.name,
      slug: data.slug,
      description: data.description,
    })
  }

  async function handleArchive(id: string) {
    if (!apiKeyHash) return
    await archiveProject({
      apiKeyHash,
      id: id as never, // Convex ID type
    })
  }

  const mapped = (projects ?? []).map((t) => ({
    _id: t._id as string,
    name: t.name,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    stats:
      "stats" in t
        ? (
            t as {
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
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize work by project context</p>
        </div>
        <ProjectForm onSubmit={handleCreate} />
      </div>

      <ProjectCards projects={mapped} onArchive={handleArchive} />
    </div>
  )
}
