/**
 * RecapBanner — "what changed since you last opened this space?"
 *
 * Shipped per UX-2 (storybloq-inspired). Mounted at the space-layout
 * level so every sub-page renders it consistently. Three rendering
 * modes:
 *
 *   1. No baseline yet     → "Establish baseline" CTA.
 *   2. Baseline + changes  → markdown diff + "Update snapshot" CTA.
 *   3. Baseline + no diff  → quiet "up to date" pill.
 *
 * Dismissal is per-baseline (localStorage keyed by baselineSnapshotId)
 * so once the user reads it, that exact recap stays gone — but the
 * next session's recap surfaces fresh.
 */
import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { Camera, ChevronDown, ChevronRight, Clock, Loader2, Sparkles, X } from "lucide-react"
import { useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RecapResult {
  hasBaseline: boolean
  baselineSnapshotId: string | null
  baselineCreatedAt: number | null
  scope: { spaceId?: string; projectId?: string }
  tasks: {
    added: Array<{ id: string; title: string }>
    removed: Array<{ id: string; title: string }>
    statusChanged: Array<{ id: string; title: string; from?: string; to?: string }>
  }
  issues: {
    added: Array<{ id: string; title: string }>
    resolved: Array<{ id: string; title: string }>
    statusChanged: Array<{ id: string; title: string }>
    severityChanged: Array<{ id: string; title: string }>
  }
  memories: { addedCount: number; deprecatedCount: number }
  debt: {
    previousOpenIssues: number
    currentOpenIssues: number
    delta: number
    growthRatio: number
  }
  markdown: string
}

interface RecapBannerProps {
  spaceId?: string
  projectId?: string
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

function totalChangeCount(recap: RecapResult): number {
  return (
    recap.tasks.added.length +
    recap.tasks.removed.length +
    recap.tasks.statusChanged.length +
    recap.issues.added.length +
    recap.issues.resolved.length +
    recap.issues.statusChanged.length +
    recap.issues.severityChanged.length +
    recap.memories.addedCount +
    recap.memories.deprecatedCount
  )
}

function summaryBadges(recap: RecapResult): Array<{ label: string; tone: "default" | "warn" }> {
  const badges: Array<{ label: string; tone: "default" | "warn" }> = []
  const t = recap.tasks.added.length + recap.tasks.statusChanged.length
  if (t > 0) badges.push({ label: `${t} task${t === 1 ? "" : "s"}`, tone: "default" })
  const iAdded = recap.issues.added.length
  const iResolved = recap.issues.resolved.length
  if (iResolved > 0) badges.push({ label: `${iResolved} resolved`, tone: "default" })
  if (iAdded > 0)
    badges.push({ label: `${iAdded} new issue${iAdded === 1 ? "" : "s"}`, tone: "warn" })
  if (recap.memories.addedCount > 0)
    badges.push({
      label: `${recap.memories.addedCount} new ${recap.memories.addedCount === 1 ? "memory" : "memories"}`,
      tone: "default",
    })
  if (recap.debt.delta > 1 && recap.debt.growthRatio > 0.25)
    badges.push({
      label: `debt ↑ ${recap.debt.previousOpenIssues}→${recap.debt.currentOpenIssues}`,
      tone: "warn",
    })
  return badges
}

function dismissalKey(baselineId: string | null): string {
  return `dodev:recap-dismissed:${baselineId ?? "no-baseline"}`
}

export function RecapBanner({ spaceId, projectId }: RecapBannerProps) {
  const { apiKeyHash } = useAuth()

  const recap = useQuery(
    api.snapshots.recap,
    apiKeyHash && (spaceId || projectId)
      ? {
          apiKeyHash,
          ...(projectId ? { projectId: projectId as never } : { spaceId: spaceId as never }),
          markdown: true,
        }
      : "skip"
  ) as RecapResult | undefined

  const takeSnapshot = useMutation(api.snapshots.take)
  const [snapping, setSnapping] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState<string | null>(null)

  // Hydrate dismissal state from localStorage when recap loads.
  useEffect(() => {
    if (!recap) return
    const key = dismissalKey(recap.baselineSnapshotId)
    if (typeof window !== "undefined" && window.localStorage.getItem(key) === "1") {
      setDismissed(key)
    } else {
      setDismissed(null)
    }
  }, [recap])

  if (!recap) return null

  const isDismissed = dismissed === dismissalKey(recap.baselineSnapshotId)
  if (isDismissed) return null

  async function handleSnapshot() {
    if (!apiKeyHash) return
    setSnapping(true)
    try {
      await takeSnapshot({
        apiKeyHash,
        ...(projectId ? { projectId: projectId as never } : { spaceId: spaceId as never }),
        trigger: "manual",
      })
    } finally {
      setSnapping(false)
    }
  }

  function handleDismiss() {
    if (!recap) return
    const key = dismissalKey(recap.baselineSnapshotId)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, "1")
    }
    setDismissed(key)
  }

  // Mode 1 — no baseline yet
  if (!recap.hasBaseline) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-surface px-4 py-3",
          "flex items-center gap-3"
        )}
      >
        <Camera className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 text-sm text-muted-foreground">
          No baseline snapshot for this {projectId ? "project" : "space"} yet. Take one and the next
          session will see what changed.
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSnapshot}
          disabled={snapping || !apiKeyHash}
        >
          {snapping ? <Loader2 className="size-3.5 animate-spin" /> : "Establish baseline"}
        </Button>
      </div>
    )
  }

  const totalChanges = totalChangeCount(recap)
  const badges = summaryBadges(recap)
  const baselineLabel = recap.baselineCreatedAt ? timeAgo(recap.baselineCreatedAt) : "—"

  // Mode 3 — baseline but nothing changed
  if (totalChanges === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface px-4 py-2",
          "flex items-center justify-between gap-3 text-xs text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="size-3.5" />
          Up to date — no changes since last snapshot
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3" />
            baseline {baselineLabel}
          </span>
          <button
            type="button"
            onClick={handleSnapshot}
            disabled={snapping || !apiKeyHash}
            className="rounded-md px-2 py-0.5 hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Take new snapshot"
          >
            {snapping ? <Loader2 className="size-3 animate-spin" /> : "Snapshot now"}
          </button>
        </span>
      </div>
    )
  }

  // Mode 2 — baseline + diff
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3",
          expanded ? "border-b border-border" : ""
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Sparkles className="size-4 shrink-0 text-emerald-500" />
          <span className="text-sm font-medium">
            {totalChanges} change{totalChanges === 1 ? "" : "s"} since last snapshot
          </span>
          <span className="text-xs text-muted-foreground">· baseline {baselineLabel}</span>
        </button>
        <div className="flex items-center gap-1.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                b.tone === "warn"
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {b.label}
            </span>
          ))}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-3 px-4 py-3">
          <div className="prose prose-sm max-w-none text-sm text-foreground dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-headings:hidden">
            <Markdown remarkPlugins={[remarkGfm]}>{recap.markdown}</Markdown>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSnapshot}
              disabled={snapping || !apiKeyHash}
            >
              {snapping ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Camera className="size-3.5" />
                  <span>Snapshot now</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
