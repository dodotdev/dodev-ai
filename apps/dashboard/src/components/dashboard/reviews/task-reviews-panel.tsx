/**
 * TaskReviewsPanel — PR-style verdict UI for R4 reviews on a task.
 *
 * Each review row mirrors a GitHub review block:
 *   - Verdict color band (approve = emerald, approve_w_suggestions =
 *     emerald-soft, needs_revision = amber, blocker = red, error = gray).
 *   - Stage pill (plan / code / ad_hoc).
 *   - Reviewer model badge.
 *   - One-paragraph summary.
 *   - Expandable findings list grouped by severity.
 *
 * Mounts in ItemDetailView above Comments. Live-queryable via Convex
 * useQuery so a request_review action triggered by an agent updates
 * the panel in real time.
 */
import { api } from "@dodev/convex/api"
import { useQuery } from "convex/react"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Info,
  ShieldAlert,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Verdict = "approve" | "approve_with_suggestions" | "needs_revision" | "blocker" | "error"

type Stage = "plan" | "code" | "ad_hoc"
type Severity = "critical" | "major" | "minor" | "suggestion"

interface ReviewFinding {
  category: string
  severity: Severity
  title: string
  description: string
  location?: string
}

interface Review {
  _id: string
  stage: Stage
  reviewerModel: string
  verdict: Verdict
  summary: string
  findings: ReviewFinding[]
  durationMs: number
  errorMessage?: string
  createdAt: number
}

interface VerdictSpec {
  label: string
  Icon: typeof Check
  band: string
  text: string
  badgeBg: string
  badgeText: string
}

const VERDICTS: Record<Verdict, VerdictSpec> = {
  approve: {
    label: "Approved",
    Icon: Check,
    band: "border-l-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
  approve_with_suggestions: {
    label: "Approved · with suggestions",
    Icon: Check,
    band: "border-l-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
  needs_revision: {
    label: "Needs revision",
    Icon: AlertTriangle,
    band: "border-l-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
  blocker: {
    label: "Blocker",
    Icon: ShieldAlert,
    band: "border-l-red-500",
    text: "text-red-600 dark:text-red-400",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-600 dark:text-red-400",
  },
  error: {
    label: "Reviewer error",
    Icon: AlertCircle,
    band: "border-l-gray-400",
    text: "text-muted-foreground",
    badgeBg: "bg-muted",
    badgeText: "text-muted-foreground",
  },
}

const SEVERITY_ORDER: Severity[] = ["critical", "major", "minor", "suggestion"]
const SEVERITY_TONE: Record<Severity, { bg: string; text: string; Icon: typeof Check }> = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    Icon: ShieldAlert,
  },
  major: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  minor: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    Icon: Info,
  },
  suggestion: {
    bg: "bg-gray-500/10",
    text: "text-muted-foreground",
    Icon: CircleDot,
  },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

interface TaskReviewsPanelProps {
  apiKeyHash: string | null
  taskId: string | undefined
}

export function TaskReviewsPanel({ apiKeyHash, taskId }: TaskReviewsPanelProps) {
  const reviews = useQuery(
    api.reviews.listForTask,
    apiKeyHash && taskId ? { apiKeyHash, taskId: taskId as never } : "skip"
  ) as Review[] | undefined

  if (!apiKeyHash || !taskId || reviews === undefined) return null
  if (reviews.length === 0) return null

  // Latest plan + latest code surfaced first as a header strip; rest in history.
  const latestByStage: Partial<Record<Stage, Review>> = {}
  for (const r of reviews) {
    if (!latestByStage[r.stage]) latestByStage[r.stage] = r
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Reviews</h2>
        <span className="text-[11px] text-muted-foreground">
          {reviews.length} total · {Object.keys(latestByStage).length} stage
          {Object.keys(latestByStage).length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Latest-per-stage strip */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(["plan", "code"] as Stage[]).map((stage) => {
          const r = latestByStage[stage]
          const spec = r ? VERDICTS[r.verdict] : null
          return (
            <div
              key={stage}
              className={cn(
                "rounded-md border bg-surface p-2.5",
                spec ? `border-l-4 ${spec.band}` : "border-dashed text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide font-medium">{stage}</span>
                {spec && r ? (
                  <>
                    <spec.Icon className={cn("size-3.5", spec.text)} />
                    <span className={cn("text-xs font-medium", spec.text)}>{spec.label}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {timeAgo(r.createdAt)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs italic">No review yet</span>
                )}
              </div>
              {r && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.summary || (r.errorMessage ?? "(no summary)")}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Full history */}
      <ul className="mt-4 space-y-2">
        {reviews.map((review) => (
          <ReviewRow key={review._id} review={review} />
        ))}
      </ul>
    </div>
  )
}

function ReviewRow({ review }: { review: Review }) {
  const spec = VERDICTS[review.verdict]
  const [expanded, setExpanded] = useState(
    review.findings.length > 0 && review.verdict !== "approve"
  )

  return (
    <li className={cn("rounded-md border border-l-4 bg-surface", spec.band)}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <spec.Icon className={cn("size-3.5", spec.text)} />
        <span className={cn("text-xs font-medium", spec.text)}>{spec.label}</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            spec.badgeBg,
            spec.badgeText
          )}
        >
          {review.stage}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          by {review.reviewerModel}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {timeAgo(review.createdAt)}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border/60 px-3 py-2 text-xs">
          {review.summary && <p className="text-foreground">{review.summary}</p>}
          {review.errorMessage && (
            <p className="rounded bg-red-500/10 px-2 py-1 font-mono text-red-600 dark:text-red-400">
              {review.errorMessage}
            </p>
          )}
          {review.findings.length > 0 && <FindingsList findings={review.findings} />}
          {review.findings.length === 0 && !review.errorMessage && !review.summary && (
            <p className="italic text-muted-foreground">(no findings)</p>
          )}
        </div>
      )}
    </li>
  )
}

function FindingsList({ findings }: { findings: ReviewFinding[] }) {
  // Group by severity, ordered critical → suggestion.
  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: findings.filter((f) => f.severity === sev),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-2">
      {grouped.map(({ severity, items }) => {
        const tone = SEVERITY_TONE[severity]
        return (
          <div key={severity}>
            <div className="flex items-center gap-1.5">
              <tone.Icon className={cn("size-3", tone.text)} />
              <span className={cn("text-[10px] uppercase tracking-wide font-medium", tone.text)}>
                {severity} · {items.length}
              </span>
            </div>
            <ul className="mt-1 space-y-1.5">
              {items.map((finding, idx) => (
                <li
                  key={`${severity}-${idx}`}
                  className="rounded border border-border/60 bg-background px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        tone.bg,
                        tone.text
                      )}
                    >
                      {finding.category}
                    </span>
                    <span className="text-xs font-medium text-foreground">{finding.title}</span>
                    {finding.location && (
                      <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                        {finding.location}
                      </span>
                    )}
                  </div>
                  {finding.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{finding.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
