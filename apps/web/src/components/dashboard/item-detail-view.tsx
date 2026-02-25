"use client"

import {
  ArrowUpCircle,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
  X,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ListItem } from "@/components/dashboard/linear-list-view"
import { cn, formatRelativeTime } from "@/lib/utils"

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

interface ItemDetailViewProps {
  item: ListItem
  projectSlug?: string
  projectConfig?: ProjectConfig
  comments: Comment[]
  onBack: () => void
  onAddComment: (body: string) => Promise<void>
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
  comments,
  onBack,
  onAddComment,
  onUpdateItem,
  onDeleteItem,
  currentIndex,
  totalItems,
  onNavigate,
}: ItemDetailViewProps) {
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmitComment = useCallback(async () => {
    const body = commentText.trim()
    if (!body || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onAddComment(body)
      setCommentText("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
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
    <div className="flex h-full min-h-[calc(100vh-200px)] flex-col p-4">
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
            onClick={onBack}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Cards row */}
      <div className="flex flex-1 gap-4">
        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-xl border border-border/60 bg-white shadow-sm dark:bg-zinc-900">
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{item.title}</h1>
            {item.description && (
              <div className="mt-3 prose-detail">
                <Markdown remarkPlugins={[remarkGfm]}>{item.description}</Markdown>
              </div>
            )}
          </div>

          <div className="mx-6 mt-6 border-t border-border/40" />

          <div className="flex flex-1 flex-col px-6 pt-4">
            <h2 className="text-sm font-semibold text-foreground">Activity</h2>
            <div className="mt-4 flex-1 space-y-4">
              {comments.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No comments yet</p>
              )}
              {comments.map((comment) => (
                <CommentRow key={comment._id} comment={comment} />
              ))}
            </div>

            <div className="sticky bottom-0 mt-4 border-t border-border/40 bg-white pb-6 pt-4 dark:bg-zinc-900">
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value)
                      e.target.style.height = "auto"
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Leave a comment..."
                    rows={1}
                    className="w-full resize-none rounded-lg border border-border/60 bg-zinc-50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary dark:bg-zinc-800 dark:focus:bg-zinc-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  className="shrink-0 rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Send comment (Cmd+Enter)"
                >
                  <ArrowUpCircle className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar — fixed width, sticky */}
        <div className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-0 overflow-y-auto rounded-xl border border-border/60 bg-white shadow-sm dark:bg-zinc-900">
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
                        Project
                      </div>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground dark:bg-zinc-800">
                        {projectSlug}
                      </span>
                    </div>
                  )}
                </div>
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

function CommentRow({ comment }: { comment: Comment }) {
  const isAgent = comment.authorType === "agent"
  const authorName = comment.authorName ?? (isAgent ? "AI Agent" : "You")

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isAgent
            ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
        )}
      >
        {isAgent ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <div className="mt-0.5 prose-comment">
          <Markdown remarkPlugins={[remarkGfm]}>{comment.body}</Markdown>
        </div>
      </div>
    </div>
  )
}
