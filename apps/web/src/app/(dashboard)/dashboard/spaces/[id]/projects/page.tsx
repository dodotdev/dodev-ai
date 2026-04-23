"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Archive, Layers, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"

export default function SpaceProjectsPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const space = useQuery(api.spaces.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")
  const projects = useQuery(
    api.projects.list,
    apiKeyHash ? { apiKeyHash, spaceId: id as never } : "skip"
  )

  const archiveProject = useMutation(api.projects.archive)

  if (authLoading || !apiKeyHash || space === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleArchive(projectId: string) {
    if (!apiKeyHash) return
    await archiveProject({ apiKeyHash, id: projectId as never })
  }

  const activeProjects = projects.filter((p) => p.status !== "archived")
  const archivedProjects = projects.filter((p) => p.status === "archived")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nested scopes inside {space?.name ?? "this space"}. Items created with a project use
            per-project numbering ({space?.slug}-PROJECT-N).
          </p>
        </div>
        <NewProjectDialog spaceId={id} spaceSlug={space?.slug} />
      </div>

      {activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Layers className="mb-3 size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Projects are optional. Use them when a single space has multiple distinct codebases,
            services, or workstreams. Items without a project stay at the space level.
          </p>
          <div className="mt-4">
            <NewProjectDialog spaceId={id} spaceSlug={space?.slug} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeProjects.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {activeProjects.map((p) => (
                <li
                  key={p._id}
                  className="group relative rounded-lg border bg-card p-4 transition-colors hover:border-muted-foreground/40"
                >
                  <Link
                    href={`/dashboard/spaces/${id}/projects/${p._id}/settings`}
                    className="absolute inset-0"
                    aria-label={`Open ${p.name}`}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {space?.slug}-{p.slug}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{p.status}</span>
                      </div>
                      <h3 className="mt-1 font-medium">{p.name}</h3>
                      {p.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {p.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Archive project"
                      onClick={(e) => {
                        e.preventDefault()
                        void handleArchive(p._id)
                      }}
                    >
                      <Archive className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                    <span>{p.taskCounter ?? 0} tasks</span>
                    <span>{p.issueCounter ?? 0} issues</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {archivedProjects.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Archived ({archivedProjects.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {archivedProjects.map((p) => (
                  <li
                    key={p._id}
                    className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {space?.slug}-{p.slug}
                      </span>
                      <span className="ml-2 text-sm">{p.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
    </div>
  )
}
