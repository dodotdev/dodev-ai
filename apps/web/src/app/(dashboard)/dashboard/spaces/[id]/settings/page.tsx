"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Archive, ChevronRight, Layers, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { EstimateEditor } from "@/components/dashboard/settings/estimate-editor"
import { LabelEditor } from "@/components/dashboard/settings/label-editor"
import { MemberEditor } from "@/components/dashboard/settings/member-editor"
import { PersonaEditor } from "@/components/dashboard/settings/persona-editor"
import { StatusEditor } from "@/components/dashboard/settings/status-editor"
import { VersionEditor } from "@/components/dashboard/settings/version-editor"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "general", label: "General" },
  { key: "statuses", label: "Statuses" },
  { key: "labels", label: "Labels" },
  { key: "members", label: "Members" },
  { key: "projects", label: "Projects" },
  { key: "estimates", label: "Estimates" },
  { key: "versions", label: "Versions" },
  { key: "persona", label: "AI Persona" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export default function SpaceSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const tabFromUrl = searchParams.get("tab") as TabKey | null
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((t) => t.key === tabFromUrl) ? (tabFromUrl as TabKey) : "general"
  )

  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null)
  const [saving, setSaving] = useState(false)

  const space = useQuery(api.spaces.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")
  const projects = useQuery(
    api.projects.list,
    apiKeyHash && activeTab === "projects" ? { apiKeyHash, spaceId: id as never } : "skip"
  )

  const updateSpace = useMutation(api.spaces.update)
  const archiveSpace = useMutation(api.spaces.archive)
  const deleteSpace = useMutation(api.spaces.remove)
  const archiveProject = useMutation(api.projects.archive)

  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [slugError, setSlugError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (space === null) {
      router.replace("/dashboard")
    }
  }, [space, router])

  useEffect(() => {
    if (space && !initialized) {
      setEditName(space.name)
      setEditSlug((space.slug as string) ?? "")
      setEditDescription((space.description as string) ?? "")
      setInitialized(true)
    }
  }, [space, initialized])

  const spaceId = useMemo(() => id as string, [id])

  if (authLoading || !apiKeyHash || space === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!space) return null

  async function handleSaveGeneral() {
    if (!apiKeyHash) return
    setSlugError(null)
    setSaving(true)
    try {
      await updateSpace({
        apiKeyHash,
        id: spaceId as never,
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
        setSlugError("This identifier is already taken. Choose a different one.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await archiveSpace({ apiKeyHash, id: spaceId as never })
      router.push("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await deleteSpace({ apiKeyHash, id: spaceId as never })
      router.push("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure {space.name}. These settings apply to items created directly in this space and
          serve as the template for new projects.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <nav className="flex flex-col gap-0.5 md:sticky md:top-4 md:h-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setConfirmAction(null)
              }}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {activeTab === "general" && (
            <div className="space-y-8">
              <section className="space-y-4 rounded-lg border border-border/40 bg-card p-6">
                <div>
                  <h3 className="text-lg font-semibold">General</h3>
                  <p className="text-sm text-muted-foreground">
                    Name, identifier, and description for this space.
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-name">Name</Label>
                    <Input
                      id="settings-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-slug">Slug</Label>
                    <Input
                      id="settings-slug"
                      value={editSlug}
                      onChange={(e) =>
                        setEditSlug(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 5)
                        )
                      }
                      placeholder="ABC"
                      className="w-20 text-center font-mono uppercase"
                      maxLength={5}
                    />
                  </div>
                </div>
                {slugError && <p className="text-sm text-destructive">{slugError}</p>}
                {editSlug && (
                  <p className="text-xs text-muted-foreground">
                    Tasks and issues display as{" "}
                    <span className="font-mono font-medium text-foreground">
                      {editSlug.toUpperCase()}-[0]
                    </span>
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="settings-desc">Description</Label>
                  <Textarea
                    id="settings-desc"
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
                    Archive hides this space from the dashboard but preserves its data. Delete
                    permanently removes the space and every task, issue, memory, cycle, and version
                    inside it.
                  </p>

                  {confirmAction === "archive" ? (
                    <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-sm">
                        Archive <span className="font-medium">{space.name}</span>? It will be hidden
                        from the dashboard but can be restored later.
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleArchive}
                          disabled={saving}
                        >
                          {saving ? "Archiving..." : "Confirm Archive"}
                        </Button>
                      </div>
                    </div>
                  ) : confirmAction === "delete" ? (
                    <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-sm">
                        Permanently delete <span className="font-medium">{space.name}</span> and all
                        its tasks, issues, and memories? This cannot be undone.
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={saving}
                        >
                          {saving ? "Deleting..." : "Confirm Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction("archive")}
                      >
                        <Archive className="mr-1.5 size-3.5" />
                        Archive Space
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmAction("delete")}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Delete Space
                      </Button>
                    </div>
                  )}
                </div>
              </fieldset>
            </div>
          )}

          {activeTab === "statuses" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Statuses</h3>
                <p className="text-sm text-muted-foreground">
                  Workflow columns shared by tasks and issues in this space. Each status is tagged
                  with one of four base categories: Pending, In Progress, Completed, or Cancelled.
                </p>
              </div>
              <StatusEditor spaceId={spaceId} statuses={space.statuses ?? []} />
            </section>
          )}

          {activeTab === "labels" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Labels</h3>
                <p className="text-sm text-muted-foreground">
                  Color-coded tags for tasks and issues in this space.
                </p>
              </div>
              <LabelEditor spaceId={spaceId} labels={space.labels ?? []} />
            </section>
          )}

          {activeTab === "members" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Members</h3>
                <p className="text-sm text-muted-foreground">
                  People you can assign work to in this space.
                </p>
              </div>
              <MemberEditor spaceId={spaceId} members={space.members ?? []} />
            </section>
          )}

          {activeTab === "projects" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Optional filter scopes inside {space.name}. Tasks, issues, and memories tagged
                    to a project remain numbered at the space level — they just carry a{" "}
                    <code>projectId</code> you can filter by. All workflow config is inherited from
                    this space.
                  </p>
                </div>
                <NewProjectDialog spaceId={spaceId} onCreated="stay" />
              </div>

              {projects === undefined ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/40 py-10 text-center">
                  <Layers className="mb-3 size-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No projects yet</p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Use projects to segregate items within the space. Nothing else about the space
                    changes — projects share the space&apos;s statuses, labels, members, estimates,
                    and persona.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {projects
                    .filter((p) => p.status !== "archived")
                    .map((p) => {
                      return (
                        <li key={p._id as string}>
                          <Link
                            href={`/dashboard/spaces/${spaceId}/projects/${p._id}/settings`}
                            className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-md"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {p.slug}
                                </span>
                                <span className="truncate font-medium">{p.name}</span>
                                {p.status !== "active" && (
                                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {p.status}
                                  </span>
                                )}
                              </div>
                              {p.description ? (
                                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                  {p.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  if (!apiKeyHash) return
                                  await archiveProject({
                                    apiKeyHash,
                                    id: p._id as never,
                                  })
                                }}
                                className="rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                                title="Archive project"
                              >
                                <Archive className="size-3.5" />
                              </button>
                              <ChevronRight className="size-4 text-muted-foreground/50" />
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                </ul>
              )}

              {projects && projects.filter((p) => p.status === "archived").length > 0 && (
                <details className="mt-4 border-t border-border/40 pt-4 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    Archived ({projects.filter((p) => p.status === "archived").length})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {projects
                      .filter((p) => p.status === "archived")
                      .map((p) => (
                        <li
                          key={p._id as string}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
                        >
                          <span className="font-mono text-xs">{p.slug}</span>
                          <span>{p.name}</span>
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          {activeTab === "estimates" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Estimates</h3>
                <p className="text-sm text-muted-foreground">
                  Effort-sizing scale for tasks and issues in this space.
                </p>
              </div>
              <EstimateEditor
                spaceId={spaceId}
                estimateScale={space.estimateScale ?? { type: "points", values: [] }}
              />
            </section>
          )}

          {activeTab === "versions" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Versions</h3>
                <p className="text-sm text-muted-foreground">
                  Release versions for grouping completed tasks and issues.
                </p>
              </div>
              <VersionEditor spaceId={spaceId} />
            </section>
          )}

          {activeTab === "persona" && (
            <section className="rounded-lg border border-border/40 bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">AI Persona</h3>
                <p className="text-sm text-muted-foreground">
                  System prompt surfaced to AI agents working in this space via{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    get_context
                  </code>
                  . Projects inherit this unless they override.
                </p>
              </div>
              <PersonaEditor spaceId={spaceId} persona={space.persona} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
