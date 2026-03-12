"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Check, FileText, Loader2, Plus, Rocket, Trash2, X } from "lucide-react"
import { useCallback, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatRelativeTime } from "@/lib/utils"

interface VersionEditorProps {
  spaceId: string
}

export function VersionEditor({ spaceId }: VersionEditorProps) {
  const { apiKeyHash } = useAuth()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const versions = useQuery(
    api.versions.list,
    apiKeyHash ? { apiKeyHash, spaceId: spaceId as never } : "skip"
  )

  const createVersion = useMutation(api.versions.create)
  const updateVersion = useMutation(api.versions.update)
  const deleteVersion = useMutation(api.versions.remove)

  const handleCreate = useCallback(async () => {
    if (!apiKeyHash || !newName.trim()) return
    await createVersion({
      apiKeyHash,
      spaceId: spaceId as never,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
    })
    setNewName("")
    setNewDesc("")
    setCreating(false)
  }, [apiKeyHash, spaceId, newName, newDesc, createVersion])

  const handleRelease = useCallback(
    async (versionId: string) => {
      if (!apiKeyHash) return
      await updateVersion({ apiKeyHash, id: versionId as never, status: "released" })
    },
    [apiKeyHash, updateVersion]
  )

  const handleDelete = useCallback(
    async (versionId: string) => {
      if (!apiKeyHash) return
      await deleteVersion({ apiKeyHash, id: versionId as never })
      if (expandedId === versionId) setExpandedId(null)
    },
    [apiKeyHash, deleteVersion, expandedId]
  )

  const drafts = (versions ?? []).filter((v) => v.status === "draft")
  const released = (versions ?? []).filter((v) => v.status === "released")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Versions</Label>
        {!creating && (
          <Button type="button" variant="outline" size="xs" onClick={() => setCreating(true)}>
            <Plus className="mr-1 size-3" />
            Add Version
          </Button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="version-name" className="text-xs">
              Name
            </Label>
            <Input
              id="version-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. 1.0.0"
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleCreate()
                }
                if (e.key === "Escape") {
                  setCreating(false)
                  setNewName("")
                  setNewDesc("")
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version-desc" className="text-xs">
              Description
            </Label>
            <Textarea
              id="version-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Release notes (optional)"
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreating(false)
                setNewName("")
                setNewDesc("")
              }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Versions list */}
      {versions === undefined ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (versions ?? []).length === 0 && !creating ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No versions defined. Create one to start tracking releases.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Drafts */}
          {drafts.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Draft
              </p>
              <div className="space-y-1.5">
                {drafts.map((v) => (
                  <VersionRow
                    key={v._id as string}
                    version={v}
                    isExpanded={expandedId === (v._id as string)}
                    onToggle={() =>
                      setExpandedId(expandedId === (v._id as string) ? null : (v._id as string))
                    }
                    onRelease={() => handleRelease(v._id as string)}
                    onDelete={() => handleDelete(v._id as string)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Released */}
          {released.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Released
              </p>
              <div className="space-y-1.5">
                {released.map((v) => (
                  <VersionRow
                    key={v._id as string}
                    version={v}
                    isExpanded={expandedId === (v._id as string)}
                    onToggle={() =>
                      setExpandedId(expandedId === (v._id as string) ? null : (v._id as string))
                    }
                    onDelete={() => handleDelete(v._id as string)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VersionRow({
  version,
  isExpanded,
  onToggle,
  onRelease,
  onDelete,
}: {
  version: Record<string, unknown>
  isExpanded: boolean
  onToggle: () => void
  onRelease?: () => void
  onDelete: () => void
}) {
  const { apiKeyHash } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const changelog = useQuery(
    api.versions.getChangelog,
    isExpanded && apiKeyHash ? { apiKeyHash, versionId: version._id as never } : "skip"
  )

  const isDraft = version.status === "draft"

  return (
    <div className="rounded-lg border border-border">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/30"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle()
        }}
      >
        {isDraft ? (
          <FileText className="size-3.5 shrink-0 text-amber-500" />
        ) : (
          <Rocket className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <span className="flex-1 font-mono text-sm font-medium">{version.name as string}</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            isDraft
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          )}
        >
          {isDraft ? "draft" : "released"}
        </span>
        {typeof version.releasedAt === "number" && (
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeTime(version.releasedAt)}
          </span>
        )}
        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {isDraft && onRelease && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRelease()
              }}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
              title="Release"
            >
              <Rocket className="size-3.5" />
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  onDelete()
                  setConfirmDelete(false)
                }}
                className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(true)
              }}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded changelog */}
      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-2">
          {changelog === undefined ? (
            <div className="flex justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChangelogList changelog={changelog} />
          )}
        </div>
      )}
    </div>
  )
}

function ChangelogList({
  changelog,
}: {
  changelog: {
    version: Record<string, unknown>
    tasks: Array<Record<string, unknown>>
    issues: Array<Record<string, unknown>>
  }
}) {
  const { tasks, issues } = changelog
  if (tasks.length === 0 && issues.length === 0) {
    return (
      <p className="py-1 text-center text-xs text-muted-foreground">
        No changelog items. Flag tasks or issues with "Include in changelog".
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.length > 0 && (
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">Tasks</p>
          <ul className="space-y-0.5">
            {tasks.map((t) => (
              <li key={t._id as string} className="flex items-center gap-1.5 text-xs">
                <Check className="size-3 shrink-0 text-emerald-500" />
                <span className="truncate">{t.title as string}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {issues.length > 0 && (
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">Issues</p>
          <ul className="space-y-0.5">
            {issues.map((i) => (
              <li key={i._id as string} className="flex items-center gap-1.5 text-xs">
                <X className="size-3 shrink-0 text-red-400" />
                <span className="truncate">{i.title as string}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
