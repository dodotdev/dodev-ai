"use client"

import { Check, ChevronRight, Gauge, Layers, Plus, Signal, Tag, Tags, User, X } from "lucide-react"
import { useState } from "react"
import { AttachmentDropzone, type PendingFile } from "@/components/dashboard/attachment-dropzone"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ProjectConfig {
  statuses?: Array<{ id: string; name: string; category: string; color: string; position: number }>
  labels?: Array<{ id: string; name: string; color: string }>
  members?: Array<{ id: string; name: string; role: string }>
  estimateScale?: { type: string; values: string[] }
}

interface TaskFormData {
  title: string
  description?: string
  priority: string
  tags?: string[]
  statusId?: string
  labelIds?: string[]
  assigneeId?: string
  estimate?: string
  projectId?: string
  attachments?: File[]
}

interface ProjectOption {
  _id: string
  name: string
  slug: string
}

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void | Promise<void>
  projectConfig?: ProjectConfig
  /** Projects in the current space (for the optional project-tag dropdown). */
  projects?: ProjectOption[]
  /** Pre-select this project when the dialog opens. Used by the project filter on the list views. */
  defaultProjectId?: string
  trigger?: React.ReactNode
}

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "text-red-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-blue-400" },
] as const

function PriorityIcon({ className }: { className?: string }) {
  return <Signal className={cn("size-3.5", className)} />
}

export function TaskForm({
  onSubmit,
  projectConfig,
  projects,
  defaultProjectId,
  trigger,
}: TaskFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [tags, setTags] = useState("")
  const [statusId, setStatusId] = useState("")
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [assigneeId, setAssigneeId] = useState("")
  const [estimate, setEstimate] = useState("")
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setTitle("")
    setDescription("")
    setPriority("medium")
    setTags("")
    setStatusId("")
    setSelectedLabelIds([])
    setAssigneeId("")
    setEstimate("")
    setProjectId(defaultProjectId ?? "")
    // Revoke preview URLs before clearing
    for (const pf of pendingFiles) {
      if (pf.preview) URL.revokeObjectURL(pf.preview)
    }
    setPendingFiles([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        statusId: statusId || undefined,
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
        assigneeId: assigneeId || undefined,
        estimate: estimate || undefined,
        projectId: projectId || undefined,
        attachments: pendingFiles.length > 0 ? pendingFiles.map((pf) => pf.file) : undefined,
      })
      resetForm()
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  const sortedStatuses = projectConfig?.statuses
    ? [...projectConfig.statuses].sort((a, b) => a.position - b.position)
    : []

  const currentProject = projects?.find((p) => p._id === projectId)

  const currentPriority = PRIORITIES.find((p) => p.value === priority)
  const currentStatus = sortedStatuses.find((s) => s.id === statusId)
  const currentAssignee = projectConfig?.members?.find((m) => m.id === assigneeId)
  const selectedLabels = projectConfig?.labels?.filter((l) => selectedLabelIds.includes(l.id)) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          // Sync projectId to the current default when reopening (e.g. after
          // the caller changed the project filter).
          setProjectId(defaultProjectId ?? "")
        } else {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="New task"
          >
            <Plus className="size-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-3xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Create Task</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
              DO
            </span>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-foreground">New task</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          onPaste={(e) => {
            const clipboardFiles = e.clipboardData?.files
            if (clipboardFiles && clipboardFiles.length > 0) {
              e.preventDefault()
              const incoming = Array.from(clipboardFiles)
              const available = 20 - pendingFiles.length
              if (available <= 0) return
              const toAdd: PendingFile[] = incoming.slice(0, available).map((file) => ({
                id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                file,
                preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
              }))
              setPendingFiles((prev) => [...prev, ...toAdd])
            }
          }}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 px-5 py-2">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 focus:outline-none"
              autoFocus
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              rows={8}
              className="mt-2 w-full resize-none bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
            {/* Project Pill — filter scope inside the space */}
            {projects && projects.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Layers className="size-3.5" />
                    {currentProject ? currentProject.name : "Project"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px]">
                  <DropdownMenuLabel>Project</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProjectId("")} className="gap-2">
                    <Layers className="size-3.5 text-muted-foreground/40" />
                    No project
                    {projectId === "" && <Check className="ml-auto size-3.5" />}
                  </DropdownMenuItem>
                  {projects.map((p) => (
                    <DropdownMenuItem
                      key={p._id}
                      onClick={() => setProjectId(p._id)}
                      className="gap-2"
                    >
                      <Layers className="size-3.5" />
                      <span className="flex-1">{p.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {p.slug}
                      </span>
                      {projectId === p._id && <Check className="ml-auto size-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Status Pill */}
            {sortedStatuses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {currentStatus ? (
                      <>
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: currentStatus.color }}
                        />
                        {currentStatus.name}
                      </>
                    ) : (
                      <>
                        <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
                        Status
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sortedStatuses.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => setStatusId(s.id)}
                      className="gap-2"
                    >
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                      {statusId === s.id && <Check className="ml-auto size-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Priority Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PriorityIcon className={currentPriority?.color} />
                  {currentPriority?.label ?? "Priority"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PRIORITIES.map((p) => (
                  <DropdownMenuItem
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className="gap-2"
                  >
                    <PriorityIcon className={p.color} />
                    {p.label}
                    {priority === p.value && <Check className="ml-auto size-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assignee Pill */}
            {projectConfig?.members && projectConfig.members.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <User className="size-3.5" />
                    {currentAssignee?.name ?? "Assignee"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  <DropdownMenuLabel>Assignee</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAssigneeId("")} className="gap-2">
                    <User className="size-3.5 text-muted-foreground/40" />
                    Unassigned
                    {assigneeId === "" && <Check className="ml-auto size-3.5" />}
                  </DropdownMenuItem>
                  {projectConfig.members.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={() => setAssigneeId(m.id)}
                      className="gap-2"
                    >
                      <User className="size-3.5" />
                      {m.name}
                      {assigneeId === m.id && <Check className="ml-auto size-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Labels Pill */}
            {projectConfig?.labels && projectConfig.labels.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Tag className="size-3.5" />
                    {selectedLabels.length > 0 ? (
                      <span className="flex items-center gap-1">
                        {selectedLabels.slice(0, 2).map((l) => (
                          <span key={l.id} className="flex items-center gap-1">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: l.color }}
                            />
                            {l.name}
                          </span>
                        ))}
                        {selectedLabels.length > 2 && (
                          <span className="text-muted-foreground">
                            +{selectedLabels.length - 2}
                          </span>
                        )}
                      </span>
                    ) : (
                      "Labels"
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  <DropdownMenuLabel>Labels</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {projectConfig.labels.map((l) => (
                    <DropdownMenuCheckboxItem
                      key={l.id}
                      checked={selectedLabelIds.includes(l.id)}
                      onCheckedChange={() => toggleLabel(l.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                        {l.name}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Estimate Pill */}
            {projectConfig?.estimateScale && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Gauge className="size-3.5" />
                    {estimate || "Estimate"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px]">
                  <DropdownMenuLabel>Estimate</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEstimate("")} className="gap-2">
                    No estimate
                    {estimate === "" && <Check className="ml-auto size-3.5" />}
                  </DropdownMenuItem>
                  {projectConfig.estimateScale.values.map((v) => (
                    <DropdownMenuItem key={v} onClick={() => setEstimate(v)} className="gap-2">
                      {v}
                      {estimate === v && <Check className="ml-auto size-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Tags Pill (more menu) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Tags className="size-3.5" />
                  {tags ? <span className="max-w-[120px] truncate">{tags}</span> : "Tags"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[220px] p-2">
                <DropdownMenuLabel>Tags (comma-separated)</DropdownMenuLabel>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="auth, backend, bug"
                  className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Footer */}
          <Separator />
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <AttachmentDropzone files={pendingFiles} onFilesChange={setPendingFiles} />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || isSubmitting}
              className="shrink-0 bg-primary px-4 text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Creating..." : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
