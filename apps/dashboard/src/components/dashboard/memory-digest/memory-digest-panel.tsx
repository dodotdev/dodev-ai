/**
 * MemoryDigestPanel — surfaces R1's curated memory ranking + the
 * one-click reinforcement loop that fixes memory sprawl.
 *
 * Different shape than MemoryGrid (which is chronological browsing).
 * Digest = "the must-know set right now" — ranked by reinforcement
 * strength + recency, deprecated rows excluded. Click "Reinforce"
 * when a memory just proved true again instead of writing a duplicate.
 *
 * Mounted on memory routes as a top section, separated from the
 * full chronological grid below. Shared between web + Electron.
 */
import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Brain, ChevronDown, ChevronRight, Clock, Sparkles, ThumbsUp } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

interface DigestEntry {
  _id: string
  content: string
  summary?: string
  tags: string[]
  type?: "fact" | "decision" | "preference" | "context" | "learning"
  reinforcements: number
  lastValidatedAt: number
  lifecycleStatus: "active" | "deprecated"
  digestRank?: number
  spaceId?: string
  projectId?: string
  score: number
}

const TYPE_TONE: Record<string, { bg: string; text: string }> = {
  fact: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  decision: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  preference: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  context: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400" },
  learning: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

interface MemoryDigestPanelProps {
  spaceId?: string
  projectId?: string
  /** Default: 10. Use 5 for compact embedding on overview pages. */
  limit?: number
  /** Compact form factor; trims metadata. */
  variant?: "full" | "compact"
}

export function MemoryDigestPanel({
  spaceId,
  projectId,
  limit = 10,
  variant = "full",
}: MemoryDigestPanelProps) {
  const { apiKeyHash } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const digest = useQuery(
    api.memories.digest,
    apiKeyHash
      ? {
          apiKeyHash,
          ...(projectId
            ? { projectId: projectId as never }
            : spaceId
              ? { spaceId: spaceId as never }
              : {}),
          limit,
        }
      : "skip"
  ) as DigestEntry[] | undefined

  const reinforce = useMutation(api.memories.reinforce)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleReinforce(id: string) {
    if (!apiKeyHash) return
    setPendingId(id)
    try {
      await reinforce({ apiKeyHash, id: id as never })
    } finally {
      setPendingId(null)
    }
  }

  if (digest === undefined) {
    return null // initial load — quiet
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
          <Sparkles className="size-4 text-emerald-500" />
          <span className="text-sm font-medium">Memory digest</span>
          <span className="text-xs text-muted-foreground">
            · {digest.length === 0 ? "no entries" : `top ${digest.length}`}
          </span>
        </button>
        <span className="text-[11px] text-muted-foreground">ranked by reinforcement + recency</span>
      </div>
      {!collapsed && (
        <div className="px-4 py-3">
          {digest.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {digest.map((entry) => {
                const typeKey = entry.type ?? "context"
                const tone = TYPE_TONE[typeKey] ?? TYPE_TONE.context
                const isPending = pendingId === entry._id
                return (
                  <li
                    key={entry._id}
                    className="rounded-md border border-border/60 bg-background px-3 py-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleReinforce(entry._id)}
                          disabled={isPending || !apiKeyHash}
                          aria-label="Reinforce this memory"
                          title="Reinforce: bump the counter to indicate this memory proved true again"
                          className={cn(
                            "rounded p-1 text-muted-foreground transition-colors",
                            "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
                            isPending && "animate-pulse text-emerald-500"
                          )}
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {entry.reinforcements}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-3">
                          {entry.summary || entry.content}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          {entry.type && (
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 font-medium",
                                tone.bg,
                                tone.text
                              )}
                            >
                              {entry.type}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            validated {timeAgo(entry.lastValidatedAt)}
                          </span>
                          {variant === "full" && entry.tags.length > 0 && (
                            <span className="text-muted-foreground/70">
                              {entry.tags.slice(0, 4).join(" · ")}
                            </span>
                          )}
                          {entry.digestRank !== undefined && (
                            <span className="rounded-sm bg-yellow-500/10 px-1 text-yellow-600 dark:text-yellow-400">
                              pinned #{entry.digestRank}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-6 text-center">
      <Brain className="size-7 text-muted-foreground/60" />
      <p className="mt-2 text-sm font-medium">No memories to surface yet</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-md">
        Once an agent calls add_memory, durable knowledge surfaces here ranked by reinforcement +
        recency. Have an existing memory that proved true again? Use reinforce_memory instead of
        writing a duplicate.
      </p>
    </div>
  )
}
