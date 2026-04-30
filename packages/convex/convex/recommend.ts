/**
 * Context-aware work recommender (R3).
 *
 * Returns a ranked, deduplicated list of tasks/issues/actions for "what
 * should I work on next?" Each recommendation carries a category, a
 * human-readable rationale, and a deterministic score so callers can
 * present them with explanations.
 *
 * Adapted from storybloq's recommend.ts — categories tuned for dodev's
 * data model (no blockedBy field, but parentTaskId / umbrellas exist;
 * cycles are time-boxed, projects are filter scopes).
 *
 * Categories (highest priority first):
 *   1. critical_issue          — open critical/major issues
 *   2. inprogress_task         — finish what's started
 *   3. near_complete_umbrella  — push 80%+ umbrellas to closure
 *   4. handover_context        — explicitly named in latest handover
 *   5. debt_trend              — open issue count growing
 *   6. priority_momentum       — top urgent/high pending tasks
 *   7. quick_win               — low-priority improvement issues
 */
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { type QueryCtx, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

type RecommendCategory =
  | "critical_issue"
  | "inprogress_task"
  | "near_complete_umbrella"
  | "handover_context"
  | "debt_trend"
  | "priority_momentum"
  | "quick_win"
  | "open_issue"

type RecommendKind = "task" | "issue" | "action"

interface Recommendation {
  id: string
  kind: RecommendKind
  title: string
  category: RecommendCategory
  reason: string
  score: number
  /** Optional metadata payload — kind-specific extras callers may render. */
  meta?: Record<string, unknown>
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  trivial: 1,
}

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const HANDOVER_BOOST = 50
const DEBT_GROWTH_THRESHOLD = 0.25
const DEBT_ABSOLUTE_MINIMUM = 2

export const recommend = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    /** Max results (1-10). Default: 5. */
    count: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ recommendations: Recommendation[]; totalCandidates: number }> => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const count = Math.max(1, Math.min(10, args.count ?? 5))

    const scope = resolveScope(args)
    const tasks = await loadTasks(ctx, user._id, scope)
    const issues = await loadIssues(ctx, user._id, scope)

    const dedup = new Map<string, Recommendation>()

    for (const rec of generateCriticalIssues(issues)) merge(dedup, rec)
    for (const rec of generateInProgressTasks(tasks)) merge(dedup, rec)
    for (const rec of generateNearCompleteUmbrellas(tasks)) merge(dedup, rec)
    for (const rec of generatePriorityMomentum(tasks)) merge(dedup, rec)
    for (const rec of generateOpenIssues(issues)) merge(dedup, rec)
    for (const rec of generateQuickWins(issues)) merge(dedup, rec)

    // Handover boost — only the most recent handover in the scope.
    const latestHandover = await loadLatestHandover(ctx, user._id, scope)
    if (latestHandover) {
      applyHandoverBoost(dedup, latestHandover)
    }

    // Debt trend — open-issue growth between the latest two snapshots.
    const debtRec = await generateDebtTrend(ctx, user._id, scope, issues)
    if (debtRec) merge(dedup, debtRec)

    const sorted = [...dedup.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Category priority tiebreak.
      const catRank: Record<RecommendCategory, number> = {
        critical_issue: 1,
        inprogress_task: 2,
        near_complete_umbrella: 3,
        handover_context: 4,
        debt_trend: 5,
        priority_momentum: 6,
        quick_win: 7,
        open_issue: 8,
      }
      const c = catRank[a.category] - catRank[b.category]
      if (c !== 0) return c
      return a.id.localeCompare(b.id)
    })

    return {
      recommendations: sorted.slice(0, count),
      totalCandidates: sorted.length,
    }
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveScope(args: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }) {
  if (args.projectId) return { projectId: args.projectId }
  return { spaceId: args.spaceId }
}

async function loadTasks(
  ctx: QueryCtx,
  userId: Id<"users">,
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<Doc<"tasks">[]> {
  if (scope.projectId) {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", userId).eq("projectId", scope.projectId))
      .collect()
  }
  if (scope.spaceId) {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_space", (q) => q.eq("userId", userId).eq("spaceId", scope.spaceId))
      .collect()
  }
  return await ctx.db
    .query("tasks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
}

async function loadIssues(
  ctx: QueryCtx,
  userId: Id<"users">,
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<Doc<"issues">[]> {
  if (scope.projectId) {
    return await ctx.db
      .query("issues")
      .withIndex("by_user_project", (q) => q.eq("userId", userId).eq("projectId", scope.projectId))
      .collect()
  }
  if (scope.spaceId) {
    return await ctx.db
      .query("issues")
      .withIndex("by_user_space", (q) => q.eq("userId", userId).eq("spaceId", scope.spaceId))
      .collect()
  }
  return await ctx.db
    .query("issues")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
}

async function loadLatestHandover(
  ctx: QueryCtx,
  userId: Id<"users">,
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<Doc<"handovers"> | null> {
  if (scope.projectId) {
    return await ctx.db
      .query("handovers")
      .withIndex("by_user_project_created", (q) =>
        q.eq("userId", userId).eq("projectId", scope.projectId)
      )
      .order("desc")
      .first()
  }
  if (scope.spaceId) {
    return await ctx.db
      .query("handovers")
      .withIndex("by_user_space_created", (q) =>
        q.eq("userId", userId).eq("spaceId", scope.spaceId)
      )
      .order("desc")
      .first()
  }
  return null
}

function isOpenIssueStatus(status: string): boolean {
  return status === "pending" || status === "in_progress"
}

function merge(dedup: Map<string, Recommendation>, rec: Recommendation) {
  const existing = dedup.get(rec.id)
  if (!existing || rec.score > existing.score) {
    dedup.set(rec.id, rec)
  }
}

// ---------------------------------------------------------------------------
// Category generators
// ---------------------------------------------------------------------------

function generateCriticalIssues(issues: Doc<"issues">[]): Recommendation[] {
  const open = issues
    .filter((i) => isOpenIssueStatus(i.status))
    .filter((i) => i.severity === "critical" || i.severity === "major")
    .sort((a, b) => {
      const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      if (sev !== 0) return sev
      return b.createdAt - a.createdAt // newer first
    })

  return open.map((issue, idx) => ({
    id: issue._id,
    kind: "issue" as const,
    title: issue.title,
    category: "critical_issue" as const,
    reason:
      issue.status === "in_progress"
        ? `${capitalize(issue.severity)} severity issue — already in progress`
        : `${capitalize(issue.severity)} severity issue — address before new features`,
    score: 900 - Math.min(idx, 99),
    meta: { severity: issue.severity, status: issue.status },
  }))
}

function generateInProgressTasks(tasks: Doc<"tasks">[]): Recommendation[] {
  const inProgress = tasks
    .filter((t) => t.status === "in_progress")
    .sort((a, b) => {
      const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      if (p !== 0) return p
      return a.updatedAt - b.updatedAt // older first — finish stalled work
    })

  return inProgress.map((task, idx) => ({
    id: task._id,
    kind: "task" as const,
    title: task.title,
    category: "inprogress_task" as const,
    reason: "In-progress — finish what's started",
    score: 800 - Math.min(idx, 99),
    meta: { priority: task.priority },
  }))
}

function generateNearCompleteUmbrellas(tasks: Doc<"tasks">[]): Recommendation[] {
  // Group by parent.
  const byParent = new Map<string, Doc<"tasks">[]>()
  for (const t of tasks) {
    if (!t.parentTaskId) continue
    const list = byParent.get(t.parentTaskId) ?? []
    list.push(t)
    byParent.set(t.parentTaskId, list)
  }

  const candidates: Array<{
    parentId: string
    parent: Doc<"tasks"> | undefined
    nextLeaf: Doc<"tasks">
    complete: number
    total: number
    ratio: number
  }> = []

  for (const [parentId, leaves] of byParent) {
    if (leaves.length < 2) continue
    const completeCount = leaves.filter((l) => l.status === "completed").length
    const ratio = completeCount / leaves.length
    if (ratio < 0.8 || ratio === 1) continue

    const incomplete = leaves
      .filter((l) => l.status !== "completed" && l.status !== "cancelled")
      .sort((a, b) => {
        const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
        if (p !== 0) return p
        return a.createdAt - b.createdAt
      })
    if (incomplete.length === 0) continue

    candidates.push({
      parentId,
      parent: tasks.find((t) => t._id === parentId),
      nextLeaf: incomplete[0],
      complete: completeCount,
      total: leaves.length,
      ratio,
    })
  }

  candidates.sort((a, b) => b.ratio - a.ratio)

  return candidates.map((c, idx) => ({
    id: c.nextLeaf._id,
    kind: "task" as const,
    title: c.nextLeaf.title,
    category: "near_complete_umbrella" as const,
    reason: `${c.complete}/${c.total} complete in umbrella "${c.parent?.title ?? c.parentId}" — close it out`,
    score: 700 - Math.min(idx, 99),
    meta: { umbrellaId: c.parentId, complete: c.complete, total: c.total },
  }))
}

function generatePriorityMomentum(tasks: Doc<"tasks">[]): Recommendation[] {
  const candidates = tasks
    .filter((t) => t.status === "pending")
    .filter((t) => t.priority === "urgent" || t.priority === "high")
    .sort((a, b) => {
      const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      if (p !== 0) return p
      const aDue = a.dueDate ?? Number.MAX_SAFE_INTEGER
      const bDue = b.dueDate ?? Number.MAX_SAFE_INTEGER
      if (aDue !== bDue) return aDue - bDue
      return a.createdAt - b.createdAt
    })

  return candidates.map((task, idx) => ({
    id: task._id,
    kind: "task" as const,
    title: task.title,
    category: "priority_momentum" as const,
    reason: `${capitalize(task.priority)} priority — pending`,
    score: 500 - Math.min(idx, 99),
    meta: { priority: task.priority, dueDate: task.dueDate },
  }))
}

function generateOpenIssues(issues: Doc<"issues">[]): Recommendation[] {
  const open = issues
    .filter((i) => isOpenIssueStatus(i.status))
    .filter((i) => i.severity === "minor")
    .sort((a, b) => b.createdAt - a.createdAt)

  return open.map((issue, idx) => ({
    id: issue._id,
    kind: "issue" as const,
    title: issue.title,
    category: "open_issue" as const,
    reason: `${capitalize(issue.severity)} severity issue`,
    score: 300 - Math.min(idx, 99),
    meta: { severity: issue.severity },
  }))
}

function generateQuickWins(issues: Doc<"issues">[]): Recommendation[] {
  const wins = issues
    .filter((i) => isOpenIssueStatus(i.status))
    .filter((i) => i.severity === "trivial")
    .sort((a, b) => b.createdAt - a.createdAt)

  return wins.map((issue, idx) => ({
    id: issue._id,
    kind: "issue" as const,
    title: issue.title,
    category: "quick_win" as const,
    reason: "Trivial-severity issue — quick win",
    score: 400 - Math.min(idx, 99),
    meta: { severity: issue.severity },
  }))
}

async function generateDebtTrend(
  ctx: QueryCtx,
  userId: Id<"users">,
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> },
  currentIssues: Doc<"issues">[]
): Promise<Recommendation | null> {
  const baselineRow = scope.projectId
    ? await ctx.db
        .query("snapshots")
        .withIndex("by_user_project_created", (q) =>
          q.eq("userId", userId).eq("projectId", scope.projectId)
        )
        .order("desc")
        .first()
    : scope.spaceId
      ? await ctx.db
          .query("snapshots")
          .withIndex("by_user_space_created", (q) =>
            q.eq("userId", userId).eq("spaceId", scope.spaceId)
          )
          .order("desc")
          .first()
      : null
  if (!baselineRow) return null

  const previousOpen = baselineRow.counts.issues.pending + baselineRow.counts.issues.inProgress
  const currentOpen = currentIssues.filter((i) => isOpenIssueStatus(i.status)).length
  if (previousOpen <= 0) return null

  const delta = currentOpen - previousOpen
  const growth = delta / previousOpen
  if (growth <= DEBT_GROWTH_THRESHOLD || delta < DEBT_ABSOLUTE_MINIMUM) return null

  return {
    id: "DEBT_TREND",
    kind: "action",
    title: "Issue debt growing",
    category: "debt_trend",
    reason: `Open issues grew from ${previousOpen} to ${currentOpen} (+${Math.round(growth * 100)}%). Consider triage before new features.`,
    score: 450,
    meta: { previousOpen, currentOpen, growth },
  }
}

// ---------------------------------------------------------------------------
// Handover boost
// ---------------------------------------------------------------------------

const TASK_ID_RE = /\b[a-z0-9]{24,}\b/gi

function applyHandoverBoost(dedup: Map<string, Recommendation>, handover: Doc<"handovers">) {
  // Prefer structured nextSteps + referencedTaskIds. Fall back to scanning the
  // markdown for "What's Next" sections (storybloq pattern).
  const referencedIds = new Set<string>()

  for (const id of handover.referencedTaskIds ?? []) referencedIds.add(id as string)
  for (const id of handover.referencedIssueIds ?? []) referencedIds.add(id as string)

  // Markdown actionable-section scan as a fallback signal.
  const fromMarkdown = extractIdsFromActionableSections(handover.markdown)
  for (const id of fromMarkdown) referencedIds.add(id)

  for (const id of referencedIds) {
    const existing = dedup.get(id)
    if (existing) {
      dedup.set(id, {
        ...existing,
        score: existing.score + HANDOVER_BOOST,
        reason: `${existing.reason} (named in latest handover)`,
      })
    } else {
      // No existing rec for this id — synthesize a handover-context entry.
      // The kind/title here are placeholders; the caller can hydrate by
      // looking up the id. We don't fetch the doc here to keep this
      // generator pure (and the caller already knows tasks/issues exist).
      dedup.set(id, {
        id,
        kind: "task",
        title: "Referenced in latest handover",
        category: "handover_context",
        reason: "Named in latest handover's nextSteps",
        score: 350,
      })
    }
  }
}

const ACTIONABLE_HEADING_RE = /^#+\s.*(next|open|remaining|todo|blocked)/im

function extractIdsFromActionableSections(markdown: string): Set<string> {
  const ids = new Set<string>()
  if (!markdown) return ids
  const lines = markdown.split("\n")
  let inSection = false
  for (const line of lines) {
    if (/^#+\s/.test(line)) {
      inSection = ACTIONABLE_HEADING_RE.test(line)
    }
    if (inSection) {
      const matches = line.match(TASK_ID_RE)
      if (matches) for (const m of matches) ids.add(m)
    }
  }
  return ids
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
