"use client"

import { ArrowUpCircle, Bot, ChevronDown, ChevronUp, User, X } from "lucide-react"
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
  members?: Array<{ id: string; name: string; role: string }>
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
  projectStub?: string
  projectConfig?: ProjectConfig
  comments: Comment[]
  onBack: () => void
  onAddComment: (body: string) => Promise<void>
  onUpdateItem: (updates: Record<string, unknown>) => Promise<void>
  currentIndex?: number
  totalItems?: number
  onNavigate?: (direction: "prev" | "next") => void
}

const priorityColors: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-muted-foreground",
}

export function ItemDetailView({
  item,
  projectStub,
  projectConfig,
  comments,
  onBack,
  onAddComment,
  onUpdateItem: _onUpdateItem,
  currentIndex,
  totalItems,
  onNavigate,
}: ItemDetailViewProps) {
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    item.issueId ?? (projectStub && item.number ? `${projectStub}-${item.number}` : undefined)

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
      {/* Header breadcrumb bar — above cards */}
      <div className="mb-3 flex items-center justify-between px-1">
        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          {projectStub && (
            <>
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground dark:bg-zinc-800">
                {projectStub}
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

        {/* Navigation + Close */}
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
      <div className="flex flex-1 flex-col overflow-y-auto rounded-xl border border-border/60 bg-white shadow-sm dark:bg-zinc-900">
        {/* Title and description */}
        <div className="px-6 pt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{item.title}</h1>
          {item.description && (
            <div className="mt-3 prose-detail">
              <Markdown remarkPlugins={[remarkGfm]}>{item.description}</Markdown>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-6 mt-6 border-t border-border/40" />

        {/* Activity section */}
        <div className="flex flex-1 flex-col px-6 pt-4">
          <h2 className="text-sm font-semibold text-foreground">Activity</h2>

          {/* Comments list */}
          <div className="mt-4 flex-1 space-y-4">
            {comments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No comments yet</p>
            )}
            {comments.map((comment) => (
              <CommentRow key={comment._id} comment={comment} />
            ))}
          </div>

          {/* Comment input */}
          <div className="sticky bottom-0 mt-4 border-t border-border/40 bg-white pb-6 pt-4 dark:bg-zinc-900">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value)
                    // Auto-resize
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

      {/* Right sidebar */}
      <div className="hidden w-[280px] shrink-0 overflow-y-auto rounded-xl border border-border/60 bg-white shadow-sm dark:bg-zinc-900 lg:block">
        <div className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Properties
          </h3>

          <div className="mt-4 space-y-5">
            {/* Status */}
            <PropertyRow label="Status">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                <span className="text-sm text-foreground capitalize">{statusName}</span>
              </div>
            </PropertyRow>

            {/* Priority */}
            <PropertyRow label="Priority">
              <span className={cn("text-sm font-medium capitalize", priorityColors[item.priority])}>
                {item.priority}
              </span>
            </PropertyRow>

            {/* Type (issues only) */}
            {item.type && (
              <PropertyRow label="Type">
                <span className="text-sm capitalize text-foreground">{item.type}</span>
              </PropertyRow>
            )}

            {/* Severity (issues only) */}
            {item.severity && (
              <PropertyRow label="Severity">
                <span className="text-sm capitalize text-foreground">{item.severity}</span>
              </PropertyRow>
            )}

            {/* Assignee */}
            <PropertyRow label="Assignee">
              {assigneeName ? (
                <div className="flex items-center gap-2">
                  <div className="flex size-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {assigneeInitials}
                  </div>
                  <span className="text-sm text-foreground">{assigneeName}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </PropertyRow>

            {/* Labels */}
            <PropertyRow label="Labels">
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
            </PropertyRow>

            {/* Estimate */}
            <PropertyRow label="Estimate">
              {item.estimate ? (
                <span className="rounded border border-border/60 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs text-foreground dark:bg-zinc-800">
                  {item.estimate}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </PropertyRow>

            {/* Project stub */}
            {projectStub && (
              <PropertyRow label="Project">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground dark:bg-zinc-800">
                  {projectStub}
                </span>
              </PropertyRow>
            )}

            {/* Created / Updated timestamps */}
            <PropertyRow label="Created">
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatRelativeTime(item.createdAt)}
              </span>
            </PropertyRow>

            <PropertyRow label="Updated">
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatRelativeTime(item.updatedAt)}
              </span>
            </PropertyRow>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// -- Property row --

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

// -- Comment row --

function CommentRow({ comment }: { comment: Comment }) {
  const isAgent = comment.authorType === "agent"
  const authorName = comment.authorName ?? (isAgent ? "AI Agent" : "You")

  return (
    <div className="flex gap-3">
      {/* Avatar */}
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

      {/* Content */}
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
