"use client"

import { api } from "@domcp/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Archive, Loader2, Settings, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CycleEditor } from "@/components/dashboard/settings/cycle-editor"
import { EstimateEditor } from "@/components/dashboard/settings/estimate-editor"
import { LabelEditor } from "@/components/dashboard/settings/label-editor"
import { MemberEditor } from "@/components/dashboard/settings/member-editor"
import { PersonaEditor } from "@/components/dashboard/settings/persona-editor"
import { StatusEditor } from "@/components/dashboard/settings/status-editor"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "general", label: "General" },
  { key: "workflow", label: "Workflow" },
  { key: "labels", label: "Labels" },
  { key: "members", label: "Members" },
  { key: "estimates", label: "Estimates" },
  { key: "cycles", label: "Cycles" },
  { key: "persona", label: "AI Persona" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export function ProjectHeader({
  title,
  actions,
}: {
  title: string
  actions?: React.ReactNode
}) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { apiKeyHash } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  useEffect(() => {
    if (project === null) {
      router.replace("/dashboard")
    }
  }, [project, router])

  if (!project) return null

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Project settings"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <ProjectSettingsModal projectId={id} open={settingsOpen} onOpenChange={setSettingsOpen} />
      )}
    </>
  )
}

function ProjectSettingsModal({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { apiKeyHash } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>("general")
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null)
  const [saving, setSaving] = useState(false)

  const project = useQuery(
    api.projects.get,
    apiKeyHash ? { apiKeyHash, id: projectId as never } : "skip"
  )

  const cycles = useQuery(
    api.cycles.list,
    apiKeyHash ? { apiKeyHash, projectId: projectId as never } : "skip"
  )

  const updateProject = useMutation(api.projects.update)
  const archiveProject = useMutation(api.projects.archive)
  const deleteProject = useMutation(api.projects.remove)

  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [initialized, setInitialized] = useState(false)

  // Init form values from project data
  if (project && !initialized) {
    setEditName(project.name)
    setEditDescription((project.description as string) ?? "")
    setInitialized(true)
  }

  async function handleSaveGeneral() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await updateProject({
        apiKeyHash,
        id: projectId as never,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await archiveProject({ apiKeyHash, id: projectId as never })
      onOpenChange(false)
      router.push("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await deleteProject({ apiKeyHash, id: projectId as never })
      onOpenChange(false)
      router.push("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  if (!project) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>Manage project configuration</DialogDescription>
        </DialogHeader>

        <div className="flex h-full max-h-[80vh]">
          {/* Tab sidebar */}
          <div className="w-44 shrink-0 border-r border-border bg-muted/30 p-2">
            <p className="px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Settings
            </p>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key)
                  setConfirmAction(null)
                }}
                className={cn(
                  "flex w-full rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">General</h3>
                  <p className="text-sm text-muted-foreground">
                    Project name, description, and lifecycle
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-name">Name</Label>
                    <Input
                      id="settings-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
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
                </div>

                {/* Danger zone */}
                <div className="rounded-lg border border-destructive/20 p-4">
                  <h4 className="text-sm font-semibold text-destructive">Danger Zone</h4>

                  {confirmAction === "archive" ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Archive <span className="font-medium text-foreground">{project.name}</span>?
                        It will be hidden but can be restored later.
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
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Permanently delete{" "}
                        <span className="font-medium text-foreground">{project.name}</span> and all
                        its todos, issues, and memories? This cannot be undone.
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
                    <div className="mt-3 flex items-center justify-between">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmAction("delete")}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Delete Project
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction("archive")}
                      >
                        <Archive className="mr-1.5 size-3.5" />
                        Delete Project
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "workflow" && (
              <StatusEditor projectId={projectId} statuses={project.statuses ?? []} />
            )}

            {activeTab === "labels" && (
              <LabelEditor projectId={projectId} labels={project.labels ?? []} />
            )}

            {activeTab === "members" && (
              <MemberEditor projectId={projectId} members={project.members ?? []} />
            )}

            {activeTab === "estimates" && (
              <EstimateEditor
                projectId={projectId}
                estimateScale={project.estimateScale ?? { type: "points", values: [] }}
              />
            )}

            {activeTab === "cycles" && (
              <CycleEditor
                projectId={projectId}
                cycles={(cycles ?? []).map((c) => ({
                  _id: c._id as string,
                  name: c.name,
                  status: c.status,
                  startDate: c.startDate,
                  endDate: c.endDate,
                  description: c.description,
                }))}
              />
            )}

            {activeTab === "persona" && (
              <PersonaEditor projectId={projectId} persona={project.persona} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
