"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Archive, Loader2, Trash2 } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
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

  const updateSpace = useMutation(api.spaces.update)
  const archiveSpace = useMutation(api.spaces.archive)
  const deleteSpace = useMutation(api.spaces.remove)

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
              <section className="space-y-4 rounded-lg border bg-card p-6">
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
                      {editSlug.toUpperCase()}-1
                    </span>
                    ,{" "}
                    <span className="font-mono font-medium text-foreground">
                      {editSlug.toUpperCase()}-2
                    </span>
                    , ...
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
            <section className="rounded-lg border bg-card p-6">
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
            <section className="rounded-lg border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Labels</h3>
                <p className="text-sm text-muted-foreground">
                  Color-coded tags. New projects snapshot this list at creation; edits here do not
                  affect existing projects.
                </p>
              </div>
              <LabelEditor spaceId={spaceId} labels={space.labels ?? []} />
            </section>
          )}

          {activeTab === "members" && (
            <section className="rounded-lg border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Members</h3>
                <p className="text-sm text-muted-foreground">
                  People you can assign work to. New projects snapshot this list at creation.
                </p>
              </div>
              <MemberEditor spaceId={spaceId} members={space.members ?? []} />
            </section>
          )}

          {activeTab === "estimates" && (
            <section className="rounded-lg border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Estimates</h3>
                <p className="text-sm text-muted-foreground">
                  Effort-sizing scale. Projects inherit this unless they override.
                </p>
              </div>
              <EstimateEditor
                spaceId={spaceId}
                estimateScale={space.estimateScale ?? { type: "points", values: [] }}
              />
            </section>
          )}

          {activeTab === "versions" && (
            <section className="rounded-lg border bg-card p-6">
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
            <section className="rounded-lg border bg-card p-6">
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
