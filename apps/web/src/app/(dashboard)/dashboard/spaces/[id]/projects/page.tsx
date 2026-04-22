"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Archive, Layers, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function SpaceProjectsPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", slug: "", description: "" })

  const space = useQuery(api.spaces.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")
  const projects = useQuery(
    api.projects.list,
    apiKeyHash ? { apiKeyHash, spaceId: id as never } : "skip"
  )

  const createProject = useMutation(api.projects.create)
  const archiveProject = useMutation(api.projects.archive)

  if (authLoading || !apiKeyHash || space === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKeyHash || !form.name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await createProject({
        apiKeyHash,
        spaceId: id as never,
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      setForm({ name: "", slug: "", description: "" })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setSubmitting(false)
    }
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  Projects snapshot the space&apos;s statuses, labels, and members at creation.
                  estimateScale and persona inherit from the space until you override them.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Name</Label>
                  <Input
                    id="project-name"
                    placeholder="API Service"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-slug">Slug (optional)</Label>
                  <Input
                    id="project-slug"
                    placeholder="API"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toUpperCase() })}
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Item slugs will be {space?.slug}-{form.slug || "PROJECT"}-N. Auto-derived from
                    name if left blank. Unique within the space.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description (optional)</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Short description of this project"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={5000}
                    rows={3}
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !form.name.trim()}>
                  {submitting ? "Creating..." : "Create project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Layers className="mb-3 size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Projects are optional. Use them when a single space has multiple distinct codebases,
            services, or workstreams. Items without a project stay at the space level.
          </p>
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
                    href={`/dashboard/spaces/${id}?projectId=${p._id}`}
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
