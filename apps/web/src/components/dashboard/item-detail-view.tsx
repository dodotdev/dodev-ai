"use client"

import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  PanelRight,
  Trash2,
  User,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ListItem } from "@/components/dashboard/linear-list-view"
import { useAuth } from "@/components/providers/auth-provider"
import { cn, formatRelativeTime } from "@/lib/utils"

interface Version {
  _id: string
  name: string
  status: "draft" | "released"
  description?: string
}

interface ProjectConfig {
  statuses?: Array<{
    id: string
    name: string
    category: string
    color: string
    position: number
  }>
  labels?: Array<{ id: string; name: string; color: string }>
  members?: Array<{ id: string; name: string; role: string; avatarUrl?: string }>
  estimateScale?: { type: string; values: string[] }
}

interface Comment {
  _id: string
  body: string
  authorName?: string
  authorType?: "user" | "agent"
  parentId?: string
  createdAt: number
}

interface ProjectOption {
  _id: string
  name: string
  slug: string
}

interface ItemDetailViewProps {
  item: ListItem
  projectSlug?: string
  projectConfig?: ProjectConfig
  /** Projects in the current space (for the Project selector in the sidebar). */
  projects?: ProjectOption[]
  versions?: Version[]
  comments: Comment[]
  onBack: () => void
  onAddComment: (body: string) => Promise<void>
  onUpdateComment?: (commentId: string, body: string) => Promise<void>
  onDeleteComment?: (commentId: string) => Promise<void>
  onUpdateItem: (updates: Record<string, unknown>) => Promise<void>
  onDeleteItem?: () => Promise<void>
  currentIndex?: number
  totalItems?: number
  onNavigate?: (direction: "prev" | "next") => void
}

const priorityColors: Record<string, string> = {
  urgent: "text-red-600 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
}

const priorityDots: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-zinc-400",
}

export function ItemDetailView({
  item,
  projectSlug,
  projectConfig,
  projects,
  versions,
  comments,
  onBack,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onUpdateItem,
  onDeleteItem,
  currentIndex,
  totalItems,
  onNavigate,
}: ItemDetailViewProps) {
  const { user } = useAuth()
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSidebar, setShowSidebar] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("detail-sidebar") !== "closed"
    }
    return true
  })
  const [commentFocused, setCommentFocused] = useState(false)
  const [contextCopied, setContextCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [sidebarHeight, setSidebarHeight] = useState(0)

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editDescription, setEditDescription] = useState(item.description ?? "")
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Sync local state when item changes (navigation)
  useEffect(() => {
    setEditTitle(item.title)
    setEditDescription(item.description ?? "")
    setEditingTitle(false)
    setEditingDescription(false)
  }, [item._id, item.title, item.description])

  // Auto-focus inputs when entering edit mode
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
      titleInputRef.current.style.height = "auto"
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`
    }
  }, [editingTitle])

  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus()
      // Auto-size the textarea to fit content
      descriptionRef.current.style.height = "auto"
      descriptionRef.current.style.height = `${Math.max(descriptionRef.current.scrollHeight, 120)}px`
    }
  }, [editingDescription])

  const saveTitle = useCallback(() => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== item.title) {
      onUpdateItem({ title: trimmed })
    } else {
      setEditTitle(item.title)
    }
    setEditingTitle(false)
  }, [editTitle, item.title, onUpdateItem])

  const saveDescription = useCallback(() => {
    const trimmed = editDescription.trim()
    if (trimmed !== (item.description ?? "")) {
      onUpdateItem({ description: trimmed || undefined })
    } else {
      setEditDescription(item.description ?? "")
    }
    setEditingDescription(false)
  }, [editDescription, item.description, onUpdateItem])

  useEffect(() => {
    if (sidebarRef.current) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSidebarHeight(entry.contentRect.height)
        }
      })
      ro.observe(sidebarRef.current)
      return () => ro.disconnect()
    }
  }, [])

  // Close on Escape key (unless editing inline or focused on an input)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (editingTitle || editingDescription || commentFocused) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      onBack()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onBack, editingTitle, editingDescription, commentFocused])

  const handleSubmitComment = useCallback(async () => {
    const body = commentText.trim()
    if (!body || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onAddComment(body)
      setCommentText("")
      setCommentFocused(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.blur()
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [commentText, isSubmitting, onAddComment])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmitComment()
      }
    },
    [handleSubmitComment]
  )

  // Resolve status from projectConfig
  const resolvedStatus = projectConfig?.statuses?.find((s) => s.id === item.statusId)
  const statusName = resolvedStatus?.name ?? item.status
  const statusColor = resolvedStatus?.color ?? "#6b7280"

  // Item display ID
  const itemDisplayId =
    item.issueId ?? (projectSlug && item.number ? `${projectSlug}-${item.number}` : undefined)

  // Assignee
  const assigneeName = item.resolvedAssignee?.name
  const assigneeInitials = assigneeName
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col px-0 py-2">
      {/* Header breadcrumb bar */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          {projectSlug && (
            <>
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground dark:bg-zinc-800">
                {projectSlug}
              </span>
              <span className="shrink-0 text-muted-foreground/40">/</span>
            </>
          )}
          {itemDisplayId && (
            <>
              <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground">
                {itemDisplayId}
              </span>
              <span className="shrink-0 text-muted-foreground/40">/</span>
            </>
          )}
          <span className="min-w-0 truncate text-foreground">{item.title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const toolName = item.type ? "get_issue" : "get_task"
              const displayId = itemDisplayId ?? `#${item.number}`
              const text = `Review and work on ${displayId}: "${item.title}"\nUse ${toolName} with id: "${item._id}" to get full details.`
              navigator.clipboard.writeText(text).then(() => {
                setContextCopied(true)
                setTimeout(() => setContextCopied(false), 2000)
              })
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Copy context for agent"
          >
            {contextCopied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Clipboard className="size-4" />
            )}
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          {totalItems != null && totalItems > 0 && (
            <>
              <span className="text-xs tabular-nums text-muted-foreground">
                {(currentIndex ?? 0) + 1} / {totalItems}
              </span>
              <button
                type="button"
                onClick={() => onNavigate?.("prev")}
                disabled={currentIndex === 0}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous item"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.("next")}
                disabled={currentIndex === (totalItems ?? 0) - 1}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next item"
              >
                <ChevronDown className="size-4" />
              </button>
              <div className="mx-1 h-4 w-px bg-border" />
            </>
          )}
          <button
            type="button"
            onClick={() => {
              const next = !showSidebar
              setShowSidebar(next)
              localStorage.setItem("detail-sidebar", next ? "open" : "closed")
            }}
            className={cn(
              "hidden rounded-md p-1 transition-colors lg:block",
              showSidebar
                ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                : "bg-accent text-foreground"
            )}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            <PanelRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Cards row */}
      <div className="flex items-start">
        {/* Main content area — fills viewport, scrolls internally */}
        <div
          className="flex min-w-0 flex-1 flex-col rounded-xl border border-border/60 bg-white shadow-sm dark:bg-zinc-900"
          style={{
            height: `max(calc(100vh - 260px), ${sidebarHeight > 0 ? sidebarHeight : 400}px)`,
          }}
        >
          {/* Scrollable region: title + description + comments */}
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-autohide px-4 pt-5">
            {/* Editable title */}
            {editingTitle ? (
              <div className="rounded-md border border-zinc-300 dark:border-zinc-600 -mx-1.5">
                <textarea
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      saveTitle()
                    }
                    if (e.key === "Escape") {
                      setEditTitle(item.title)
                      setEditingTitle(false)
                    }
                  }}
                  rows={1}
                  className="w-full resize-none bg-transparent px-2.5 pt-2 pb-1 text-2xl font-bold tracking-tight text-foreground outline-none"
                />
                <div className="flex items-center justify-between px-2.5 pb-2">
                  <span className="text-[11px] text-muted-foreground/50">
                    Esc to cancel · Enter to save
                  </span>
                  <button
                    type="button"
                    onClick={saveTitle}
                    disabled={!editTitle.trim()}
                    className="shrink-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity disabled:opacity-20"
                  >
                    Save Title
                  </button>
                </div>
              </div>
            ) : (
              <h1
                className="cursor-text rounded-md px-1.5 py-0.5 -mx-1.5 text-2xl font-bold tracking-tight text-foreground transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {item.title}
              </h1>
            )}

            {/* Editable description */}
            {editingDescription ? (
              <div className="mt-3 -mx-1.5 rounded-md border border-zinc-300 dark:border-zinc-600">
                <textarea
                  ref={descriptionRef}
                  value={editDescription}
                  onChange={(e) => {
                    setEditDescription(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = `${Math.max(e.target.scrollHeight, 120)}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setEditDescription(item.description ?? "")
                      setEditingDescription(false)
                    }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      saveDescription()
                    }
                  }}
                  placeholder="Add a description... (Markdown supported)"
                  className="w-full resize-none bg-transparent px-2.5 pt-2 pb-1 text-sm leading-relaxed text-foreground font-mono outline-none"
                  style={{ minHeight: 120 }}
                />
                <div className="flex items-center justify-between px-2.5 pb-2">
                  <span className="text-[11px] text-muted-foreground/50">
                    Markdown · Esc to cancel · Cmd+Enter to save
                  </span>
                  <button
                    type="button"
                    onClick={saveDescription}
                    className="shrink-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity"
                  >
                    Save Description
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="mt-3 cursor-text rounded-md px-1.5 py-1.5 -mx-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                onClick={() => setEditingDescription(true)}
                title="Click to edit"
              >
                {item.description ? (
                  <div className="prose-detail">
                    <Markdown remarkPlugins={[remarkGfm]}>{item.description}</Markdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">Add a description...</p>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-border" />

            <div className="pt-4">
              <h2 className="text-sm font-semibold text-foreground">Comments</h2>
              <div className="mt-4 space-y-4 pb-2">
                {comments.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No comments yet</p>
                )}
                {comments.map((comment) => (
                  <CommentRow
                    key={comment._id}
                    comment={comment}
                    userAvatarUrl={user?.avatarUrl}
                    isOwner={comment.authorType !== "agent"}
                    onEdit={
                      onUpdateComment ? (body) => onUpdateComment(comment._id, body) : undefined
                    }
                    onDelete={onDeleteComment ? () => onDeleteComment(comment._id) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Pinned comment input at bottom */}
          <div className="shrink-0 border-t border-border/40 px-4 pb-4 pt-3">
            <div
              className={cn(
                "comment-input relative rounded-lg bg-zinc-50 transition-all duration-200 dark:bg-zinc-800",
                commentFocused && "bg-white dark:bg-zinc-800 ring-1 ring-ring/30"
              )}
            >
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value)
                  if (commentFocused) {
                    e.target.style.height = "auto"
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
                  }
                }}
                onFocus={() => {
                  setCommentFocused(true)
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "auto"
                    const target = Math.max(textareaRef.current.scrollHeight, 80)
                    textareaRef.current.style.height = `${Math.min(target, 200)}px`
                  }
                }}
                onBlur={() => {
                  if (!commentText.trim()) {
                    setCommentFocused(false)
                    if (textareaRef.current) {
                      textareaRef.current.style.height = "auto"
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  commentFocused ? "Write a comment... (Markdown supported)" : "Leave a comment..."
                }
                rows={1}
                className={cn(
                  "w-full resize-none bg-transparent px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-all duration-200",
                  commentFocused && "font-mono"
                )}
                style={{ border: "none", outline: "none", boxShadow: "none" }}
              />
              <div
                className={cn(
                  "flex items-center justify-between px-3 pb-2 transition-all duration-200",
                  commentFocused ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden pb-0"
                )}
              >
                <span className="text-[11px] text-muted-foreground/50">
                  Markdown · Cmd+Enter to save
                </span>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  className="shrink-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity disabled:opacity-20"
                  title="Save comment (Cmd+Enter)"
                >
                  Save Comment
                </button>
              </div>
              {!commentFocused && (
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  className="absolute bottom-2 right-2 shrink-0 rounded-md bg-foreground p-1 text-background transition-opacity disabled:opacity-20"
                  title="Save comment (Cmd+Enter)"
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar — fixed width, toggleable with slide animation */}
        <div
          ref={sidebarRef}
          className={cn(
            "hidden shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:block",
            showSidebar ? "ml-4 w-[260px] opacity-100" : "ml-0 w-0 opacity-0"
          )}
        >
          <div className="w-[260px] overflow-y-auto rounded-xl border border-border/60 bg-white shadow-sm dark:bg-zinc-900">
            <div className="p-4">
              {(itemDisplayId || projectSlug) && (
                <div className="mb-3 border-b border-border/30 pb-3">
                  {itemDisplayId && (
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {itemDisplayId}
                    </span>
                  )}
                  {projectSlug && (
                    <div className="mt-3">
                      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        Space
                      </div>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground dark:bg-zinc-800">
                        {projectSlug}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Project — filter scope inside the space */}
              {projects && projects.length > 0 && (
                <>
                  <PropertySelect
                    label="Project"
                    value={item.projectId ?? ""}
                    options={[
                      { value: "", label: "No project" },
                      ...projects.map((p) => ({
                        value: p._id,
                        label: p.name,
                      })),
                    ]}
                    fallbackDisplay={
                      item.projectId ? (
                        <span>
                          {projects.find((p) => p._id === item.projectId)?.name ?? "Unknown"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No project</span>
                      )
                    }
                    onChange={(val) => onUpdateItem({ projectId: val === "" ? null : val })}
                  />
                  <div className="my-3 border-t border-border/30" />
                </>
              )}

              {/* Status */}
              <PropertySelect
                label="Status"
                value={item.statusId ?? item.status}
                options={(projectConfig?.statuses ?? []).map((s) => ({
                  value: s.id,
                  label: s.name,
                  dot: s.color,
                }))}
                fallbackDisplay={
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span className="capitalize">{statusName}</span>
                  </div>
                }
                onChange={(val) => onUpdateItem({ statusId: val })}
              />

              <div className="my-3 border-t border-border/30" />

              {/* Priority */}
              <PropertySelect
                label="Priority"
                value={item.priority}
                options={[
                  { value: "urgent", label: "Urgent", dot: priorityDots.urgent },
                  { value: "high", label: "High", dot: priorityDots.high },
                  { value: "medium", label: "Medium", dot: priorityDots.medium },
                  { value: "low", label: "Low", dot: priorityDots.low },
                ]}
                fallbackDisplay={
                  <span className={cn("capitalize font-medium", priorityColors[item.priority])}>
                    {item.priority}
                  </span>
                }
                onChange={(val) => onUpdateItem({ priority: val })}
              />

              <div className="my-3 border-t border-border/30" />

              {/* Assignee */}
              <PropertySelect
                label="Assignee"
                value={item.assigneeId ?? ""}
                options={[
                  { value: "", label: "Unassigned" },
                  ...(projectConfig?.members ?? []).map((m) => ({
                    value: m.id,
                    label: m.name,
                    image: m.avatarUrl,
                  })),
                ]}
                fallbackDisplay={
                  assigneeName ? (
                    <div className="flex items-center gap-2">
                      {item.resolvedAssignee?.avatarUrl ? (
                        <img
                          src={item.resolvedAssignee.avatarUrl}
                          alt={assigneeName}
                          className="size-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {assigneeInitials}
                        </div>
                      )}
                      <span>{assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )
                }
                onChange={(val) => onUpdateItem({ assigneeId: val || null })}
              />

              {/* Type (issues only) */}
              {item.type && (
                <>
                  <div className="my-3 border-t border-border/30" />
                  <PropertySelect
                    label="Type"
                    value={item.type}
                    options={[
                      { value: "bug", label: "Bug" },
                      { value: "feature", label: "Feature" },
                      { value: "improvement", label: "Improvement" },
                      { value: "task", label: "Task" },
                    ]}
                    fallbackDisplay={<span className="capitalize">{item.type}</span>}
                    onChange={(val) => onUpdateItem({ type: val })}
                  />
                </>
              )}

              {/* Severity (issues only) */}
              {item.severity && (
                <>
                  <div className="my-3 border-t border-border/30" />
                  <PropertySelect
                    label="Severity"
                    value={item.severity}
                    options={[
                      { value: "critical", label: "Critical" },
                      { value: "major", label: "Major" },
                      { value: "minor", label: "Minor" },
                      { value: "trivial", label: "Trivial" },
                    ]}
                    fallbackDisplay={<span className="capitalize">{item.severity}</span>}
                    onChange={(val) => onUpdateItem({ severity: val })}
                  />
                </>
              )}

              {/* Labels */}
              <div className="my-3 border-t border-border/30" />
              <div>
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Labels
                </div>
                {item.resolvedLabels && item.resolvedLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.resolvedLabels.map((label) => (
                      <span
                        key={label.id}
                        className="flex items-center gap-1 rounded-full border border-border/60 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-muted-foreground dark:bg-zinc-800"
                      >
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>

              {/* Estimate */}
              {projectConfig?.estimateScale && (
                <>
                  <div className="my-3 border-t border-border/30" />
                  <PropertySelect
                    label="Estimate"
                    value={item.estimate ?? ""}
                    options={[
                      { value: "", label: "None" },
                      ...projectConfig.estimateScale.values.map((v) => ({
                        value: v,
                        label:
                          projectConfig.estimateScale?.type === "points"
                            ? `${v} pts`
                            : projectConfig.estimateScale?.type === "hours"
                              ? `${v}h`
                              : v,
                      })),
                    ]}
                    fallbackDisplay={
                      item.estimate ? (
                        <span className="rounded border border-border/60 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
                          {item.estimate}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )
                    }
                    onChange={(val) => onUpdateItem({ estimate: val || null })}
                  />
                </>
              )}

              {/* Version */}
              {versions && versions.length > 0 && (
                <>
                  <div className="my-3 border-t border-border/30" />
                  <PropertySelect
                    label="Version"
                    value={item.versionId ?? ""}
                    options={[
                      { value: "", label: "None" },
                      ...versions.map((v) => ({
                        value: v._id,
                        label: `${v.name}${v.status === "draft" ? " (draft)" : ""}`,
                      })),
                    ]}
                    fallbackDisplay={
                      item.versionId ? (
                        <span className="rounded border border-border/60 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
                          {versions.find((v) => v._id === item.versionId)?.name ?? "Unknown"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )
                    }
                    onChange={(val) => onUpdateItem({ versionId: val || null })}
                  />
                </>
              )}

              {/* Changelog */}
              <div className="my-3 border-t border-border/30" />
              <div>
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Changelog
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateItem({ changelog: !item.changelog })}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border transition-colors",
                      item.changelog
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 dark:border-zinc-600"
                    )}
                  >
                    {item.changelog && <Check className="size-3" />}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      item.changelog ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    Include in changelog
                  </span>
                </button>
              </div>

              {/* Timestamps */}
              <div className="my-3 border-t border-border/30" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Created
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Updated
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatRelativeTime(item.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Delete */}
              {onDeleteItem && (
                <>
                  <div className="my-3 border-t border-border/30" />
                  {showDeleteConfirm ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">
                        Delete this item permanently?
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteItem()
                            setShowDeleteConfirm(false)
                          }}
                          className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="size-3.5" />
                      Delete item
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Inline dropdown property selector --

interface SelectOption {
  value: string
  label: string
  dot?: string
  image?: string
}

function PropertySelect({
  label,
  value,
  options,
  fallbackDisplay,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  fallbackDisplay: React.ReactNode
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <span className="min-w-0 truncate">{fallbackDisplay}</span>
        <ChevronDown
          className={cn(
            "ml-1 size-3.5 shrink-0 text-muted-foreground/50 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-white shadow-lg dark:bg-zinc-900">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-zinc-50 text-foreground dark:bg-zinc-800"
                      : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800"
                  )}
                >
                  {opt.image && (
                    <img
                      src={opt.image}
                      alt={opt.label}
                      className="size-4 shrink-0 rounded-full object-cover"
                    />
                  )}
                  {opt.dot && !opt.image && (
                    <span
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: opt.dot }}
                    />
                  )}
                  <span className="flex-1 text-left capitalize">{opt.label}</span>
                  {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// -- Comment row --

function CommentRow({
  comment,
  userAvatarUrl,
  isOwner,
  onEdit,
  onDelete,
}: {
  comment: Comment
  userAvatarUrl?: string
  isOwner: boolean
  onEdit?: (body: string) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const isAgent = comment.authorType === "agent"
  const authorName = comment.authorName ?? (isAgent ? "AI Agent" : "You")
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editBody.trim()
    if (!trimmed || trimmed === comment.body) {
      setEditBody(comment.body)
      setEditing(false)
      return
    }
    if (onEdit) await onEdit(trimmed)
    setEditing(false)
  }, [editBody, comment.body, onEdit])

  const handleDelete = useCallback(async () => {
    if (onDelete) await onDelete()
  }, [onDelete])

  return (
    <div className="group flex gap-3">
      {isAgent ? (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
          <Bot className="size-3.5" />
        </div>
      ) : userAvatarUrl ? (
        <img
          src={userAvatarUrl}
          alt={authorName}
          className="size-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          <User className="size-3.5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {isOwner && !editing && onDelete && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setConfirmDelete(!confirmDelete)}
                className="rounded-md p-1 text-red-500 opacity-0 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 group-hover:opacity-100"
                title="Delete comment"
              >
                <Trash2 className="size-3.5" />
              </button>
              {confirmDelete && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setConfirmDelete(false)} />
                  <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-border bg-white p-3 shadow-lg dark:bg-zinc-900">
                    <p className="text-center text-xs font-medium text-foreground">
                      Delete this comment?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 rounded-md bg-red-600 py-1 text-center text-xs font-medium text-white transition-colors hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 rounded-md border border-border py-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5 rounded-md border border-zinc-300 dark:border-zinc-600">
            <textarea
              ref={editRef}
              value={editBody}
              onChange={(e) => {
                setEditBody(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.max(e.target.scrollHeight, 60)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditBody(comment.body)
                  setEditing(false)
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSaveEdit()
                }
              }}
              className="w-full resize-none bg-transparent px-2.5 pt-2 pb-1 text-sm font-mono leading-relaxed text-foreground outline-none"
              style={{ minHeight: 60 }}
            />
            <div className="flex items-center justify-between px-2.5 pb-2">
              <span className="text-[11px] text-muted-foreground/50">
                Markdown · Esc to cancel · Cmd+Enter to save
              </span>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editBody.trim()}
                className="shrink-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity disabled:opacity-20"
              >
                Save Comment
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mt-0.5 prose-comment",
              isOwner &&
                onEdit &&
                "cursor-text rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            )}
            onClick={
              isOwner && onEdit
                ? () => {
                    setEditing(true)
                    setEditBody(comment.body)
                    setTimeout(() => editRef.current?.focus(), 0)
                  }
                : undefined
            }
            title={isOwner && onEdit ? "Click to edit" : undefined}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{comment.body}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}
