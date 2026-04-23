"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Archive, ChevronLeft, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ProjectSettingsPage() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>()
  const router = useRouter()
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null)
  const [saving, setSaving] = useState(false)

  const space = useQuery(api.spaces.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")
  const project = useQuery(
    api.projects.get,
    apiKeyHash ? { apiKeyHash, id: projectId as never } : "skip"
  )

  const updateProject = useMutation(api.projects.update)
  const archiveProject = useMutation(api.projects.archive)
  const deleteProject = useMutation(api.projects.remove)

  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [slugError, setSlugError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (project === null) {
      router.replace(`/dashboard/spaces/${id}/projects`)
    }
  }, [project, id, router])

  useEffect(() => {
    if (project && !initialized) {
      setEditName(project.name)
      setEditSlug(project.slug ?? "")
      setEditDescription(project.description ?? "")
      setInitialized(true)
    }
  }, [project, initialized])

  if (authLoading || !apiKeyHash || project === undefined || space === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!project || !space) return null

  async function handleSaveGeneral() {
    if (!apiKeyHash) return
    setSlugError(null)
    setSaving(true)
    try {
      await updateProject({
        apiKeyHash,
        id: projectId as never,
        name: editName.trim(),
        slug:
          editSlug
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "") || undefined,
        description: editDescription.trim() || undefined,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("SLUG_ALREADY_EXISTS")) {
        setSlugError("This slug is already used by another project in this space.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await archiveProject({ apiKeyHash, id: projectId as never })
      router.push(`/dashboard/spaces/${id}/projects`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await deleteProject({ apiKeyHash, id: projectId as never })
      router.push(`/dashboard/spaces/${id}/projects`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2">
        <Link
          href={`/dashboard/spaces/${id}/projects`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Back to {space.name} projects
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="font-mono text-sm text-muted-foreground">
            {space.slug}/{project.slug}
          </span>
          <span>{project.name}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Projects are filter scopes inside a space. Tasks, issues, and memories tagged to a project
          stay numbered at the space level ({space.slug}-[0]) — they just carry a{" "}
          <code>projectId</code> you can filter by. All workflow config (statuses, labels, members,
          estimates, persona) is inherited from the space and managed in the{" "}
          <Link href={`/dashboard/spaces/${id}/settings`} className="underline">
            space settings
          </Link>
          .
        </p>
      </div>

      <div className="space-y-8">
        <section className="space-y-4 rounded-lg border border-border/40 bg-card p-6">
          <div>
            <h3 className="text-lg font-semibold">General</h3>
            <p className="text-sm text-muted-foreground">
              Name, slug (unique within {space.name}), and description.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-settings-name">Name</Label>
              <Input
                id="project-settings-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-settings-slug">Slug</Label>
              <Input
                id="project-settings-slug"
                value={editSlug}
                onChange={(e) =>
                  setEditSlug(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 8)
                  )
                }
                placeholder="API"
                className="w-24 text-center font-mono uppercase"
                maxLength={8}
              />
            </div>
          </div>
          {slugError && <p className="text-sm text-destructive">{slugError}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="project-settings-desc">Description</Label>
            <Textarea
              id="project-settings-desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveGeneral} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </section>

        <fieldset className="rounded-lg border border-destructive/30 bg-card px-6 pb-6 pt-2">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
            Danger Zone
          </legend>

          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Archive hides this project from the dashboard; tasks, issues, and memories keep their{" "}
              <code>projectId</code>. Delete detaches every child item back to the space (clears{" "}
              <code>projectId</code>) and removes the project record — child data itself is never
              deleted.
            </p>

            {confirmAction === "archive" ? (
              <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm">
                  Archive <span className="font-medium">{project.name}</span>? It will be hidden but
                  can be restored later.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmAction(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleArchive} disabled={saving}>
                    {saving ? "Archiving..." : "Confirm Archive"}
                  </Button>
                </div>
              </div>
            ) : confirmAction === "delete" ? (
              <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm">
                  Delete <span className="font-medium">{project.name}</span>? Tasks, issues,
                  memories, cycles, and versions will be detached to space level — the project
                  record itself will be removed.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmAction(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                    {saving ? "Deleting..." : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setConfirmAction("archive")}>
                  <Archive className="mr-1.5 size-3.5" />
                  Archive Project
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmAction("delete")}>
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete Project
                </Button>
              </div>
            )}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
