import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

const SNAPSHOT_RETENTION = 20

/**
 * Resolve the (spaceId, projectId) scope. Exactly one must be set after
 * resolution. If only projectId is given, projectId wins; spaceId is
 * cleared to keep snapshots project-scoped.
 */
async function resolveScope(
  ctx: QueryCtx,
  args: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<{ spaceId?: Id<"spaces">; projectId?: Id<"projects"> }> {
  if (args.projectId) {
    return { projectId: args.projectId }
  }
  if (args.spaceId) {
    return { spaceId: args.spaceId }
  }
  throw new ConvexError("Snapshot requires spaceId or projectId.")
}

/**
 * Tally counts and per-task/issue/memory snapshots for a scope.
 * Memory deprecation is the R1 lifecycleStatus.
 */
async function buildCounts(
  ctx: QueryCtx,
  user: Doc<"users">,
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
) {
  // Tasks
  const tasks = scope.projectId
    ? await ctx.db
        .query("tasks")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", scope.projectId)
        )
        .collect()
    : await ctx.db
        .query("tasks")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", scope.spaceId))
        .collect()

  const issues = scope.projectId
    ? await ctx.db
        .query("issues")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", scope.projectId)
        )
        .collect()
    : await ctx.db
        .query("issues")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", scope.spaceId))
        .collect()

  // Memories: bubble-up scoped — project snapshot includes the project rows
  // only (not parent space) because recap is a delta, not a digest. Counting
  // bubble-up rows would double-count when both space and project snapshots
  // exist for the same scope.
  const memories = scope.projectId
    ? await ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", scope.projectId)
        )
        .collect()
    : await ctx.db
        .query("memories")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", scope.spaceId))
        .collect()

  const taskCounts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
  }

  const issueCounts = {
    total: issues.length,
    pending: issues.filter((i) => i.status === "pending").length,
    inProgress: issues.filter((i) => i.status === "in_progress").length,
    completed: issues.filter((i) => i.status === "completed").length,
    cancelled: issues.filter((i) => i.status === "cancelled").length,
    critical: issues.filter((i) => i.severity === "critical").length,
    major: issues.filter((i) => i.severity === "major").length,
    minor: issues.filter((i) => i.severity === "minor").length,
    trivial: issues.filter((i) => i.severity === "trivial").length,
  }

  const memoryCounts = {
    total: memories.length,
    active: memories.filter((m) => (m.lifecycleStatus ?? "active") === "active").length,
    deprecated: memories.filter((m) => m.lifecycleStatus === "deprecated").length,
  }

  return {
    counts: { tasks: taskCounts, issues: issueCounts, memories: memoryCounts },
    taskStatuses: tasks.map((t) => ({
      id: t._id,
      statusId: t.statusId,
      status: t.status,
      title: t.title,
    })),
    issueStatuses: issues.map((i) => ({
      id: i._id,
      statusId: i.statusId,
      status: i.status,
      severity: i.severity,
      title: i.title,
    })),
  }
}

/**
 * Take a snapshot of the current scope state. Idempotent in the sense that
 * back-to-back calls produce two distinct rows — pruning relies on
 * createdAt, not deduplication.
 */
export const take = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    gitHead: v.optional(v.string()),
    trigger: v.optional(
      v.union(v.literal("manual"), v.literal("pre_compact"), v.literal("session_end"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)

    const { counts, taskStatuses, issueStatuses } = await buildCounts(ctx, user, scope)

    // Pin latest handover for recap diffing.
    const latestHandover = scope.projectId
      ? await ctx.db
          .query("handovers")
          .withIndex("by_user_project_created", (q) =>
            q.eq("userId", user._id).eq("projectId", scope.projectId)
          )
          .order("desc")
          .first()
      : await ctx.db
          .query("handovers")
          .withIndex("by_user_space_created", (q) =>
            q.eq("userId", user._id).eq("spaceId", scope.spaceId)
          )
          .order("desc")
          .first()

    const now = Date.now()
    const id = await ctx.db.insert("snapshots", {
      userId: user._id,
      spaceId: scope.spaceId,
      projectId: scope.projectId,
      createdAt: now,
      gitHead: args.gitHead,
      trigger: args.trigger ?? "manual",
      latestHandoverId: latestHandover?._id,
      counts,
      taskStatuses,
      issueStatuses,
    })

    // Prune: keep newest SNAPSHOT_RETENTION per scope.
    await pruneScope(ctx, user._id, scope)

    return await ctx.db.get(id)
  },
})

async function pruneScope(
  ctx: MutationCtx,
  userId: Id<"users">,
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<{ pruned: number }> {
  const all = scope.projectId
    ? await ctx.db
        .query("snapshots")
        .withIndex("by_user_project_created", (q) =>
          q.eq("userId", userId).eq("projectId", scope.projectId)
        )
        .order("desc")
        .collect()
    : await ctx.db
        .query("snapshots")
        .withIndex("by_user_space_created", (q) =>
          q.eq("userId", userId).eq("spaceId", scope.spaceId)
        )
        .order("desc")
        .collect()

  if (all.length <= SNAPSHOT_RETENTION) return { pruned: 0 }
  const toDelete = all.slice(SNAPSHOT_RETENTION)
  for (const row of toDelete) {
    await ctx.db.delete(row._id)
  }
  return { pruned: toDelete.length }
}

/** Most recent snapshot in a scope, or null if none. */
export const latest = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)

    const row = scope.projectId
      ? await ctx.db
          .query("snapshots")
          .withIndex("by_user_project_created", (q) =>
            q.eq("userId", user._id).eq("projectId", scope.projectId)
          )
          .order("desc")
          .first()
      : await ctx.db
          .query("snapshots")
          .withIndex("by_user_space_created", (q) =>
            q.eq("userId", user._id).eq("spaceId", scope.spaceId)
          )
          .order("desc")
          .first()

    return row
  },
})

/** List snapshots in a scope, newest first. */
export const list = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)
    const limit = Math.min(args.limit ?? 20, SNAPSHOT_RETENTION)

    const rows = scope.projectId
      ? await ctx.db
          .query("snapshots")
          .withIndex("by_user_project_created", (q) =>
            q.eq("userId", user._id).eq("projectId", scope.projectId)
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("snapshots")
          .withIndex("by_user_space_created", (q) =>
            q.eq("userId", user._id).eq("spaceId", scope.spaceId)
          )
          .order("desc")
          .take(limit)

    return rows
  },
})

// ---------------------------------------------------------------------------
// recap — what changed since the last snapshot
// ---------------------------------------------------------------------------

interface RecapDiffEntry {
  id: string
  title: string
  from?: string
  to?: string
}

export interface RecapResult {
  hasBaseline: boolean
  baselineSnapshotId: Id<"snapshots"> | null
  baselineCreatedAt: number | null
  baselineGitHead: string | null
  currentGitHead: string | null
  scope: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
  tasks: {
    added: RecapDiffEntry[]
    removed: RecapDiffEntry[]
    statusChanged: RecapDiffEntry[]
  }
  issues: {
    added: RecapDiffEntry[]
    resolved: RecapDiffEntry[]
    statusChanged: RecapDiffEntry[]
    severityChanged: RecapDiffEntry[]
  }
  memories: {
    addedCount: number
    deprecatedCount: number
  }
  /** Issue debt growth — used by R3 recommend's debt_trend category. */
  debt: {
    previousOpenIssues: number
    currentOpenIssues: number
    delta: number
    growthRatio: number
  }
  markdown: string
}

/**
 * Compute deltas between current state and a baseline snapshot.
 * If no baseline is provided, uses the latest snapshot in the scope. If no
 * snapshots exist, returns hasBaseline=false (caller can render "first
 * session" copy).
 */
export const recap = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    /** Pin a specific baseline; defaults to the latest snapshot. */
    sinceSnapshotId: v.optional(v.id("snapshots")),
    /** Include markdown rendering. Default: true. */
    markdown: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<RecapResult> => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)

    let baseline: Doc<"snapshots"> | null = null
    if (args.sinceSnapshotId) {
      const pinned = await ctx.db.get(args.sinceSnapshotId)
      if (pinned && pinned.userId === user._id) {
        baseline = pinned
      }
    } else {
      baseline = scope.projectId
        ? await ctx.db
            .query("snapshots")
            .withIndex("by_user_project_created", (q) =>
              q.eq("userId", user._id).eq("projectId", scope.projectId)
            )
            .order("desc")
            .first()
        : await ctx.db
            .query("snapshots")
            .withIndex("by_user_space_created", (q) =>
              q.eq("userId", user._id).eq("spaceId", scope.spaceId)
            )
            .order("desc")
            .first()
    }

    const current = await buildCounts(ctx, user, scope)
    const includeMarkdown = args.markdown !== false

    const emptyResult: RecapResult = {
      hasBaseline: false,
      baselineSnapshotId: null,
      baselineCreatedAt: null,
      baselineGitHead: null,
      currentGitHead: null,
      scope,
      tasks: { added: [], removed: [], statusChanged: [] },
      issues: { added: [], resolved: [], statusChanged: [], severityChanged: [] },
      memories: { addedCount: 0, deprecatedCount: 0 },
      debt: { previousOpenIssues: 0, currentOpenIssues: 0, delta: 0, growthRatio: 0 },
      markdown: "",
    }

    if (!baseline) {
      const result = {
        ...emptyResult,
        memories: {
          addedCount: current.counts.memories.active,
          deprecatedCount: current.counts.memories.deprecated,
        },
        debt: {
          previousOpenIssues: 0,
          currentOpenIssues: current.counts.issues.pending + current.counts.issues.inProgress,
          delta: current.counts.issues.pending + current.counts.issues.inProgress,
          growthRatio: 0,
        },
      }
      return {
        ...result,
        markdown: includeMarkdown ? renderRecap(result, true) : "",
      }
    }

    // Diff tasks
    const baselineTasks = new Map(baseline.taskStatuses.map((t) => [t.id, t]))
    const currentTasks = new Map(current.taskStatuses.map((t) => [t.id, t]))

    const tasksAdded: RecapDiffEntry[] = []
    const tasksRemoved: RecapDiffEntry[] = []
    const tasksStatusChanged: RecapDiffEntry[] = []

    for (const [id, t] of currentTasks) {
      const prior = baselineTasks.get(id)
      if (!prior) {
        tasksAdded.push({ id, title: t.title, to: t.statusId ?? t.status })
      } else if (prior.statusId !== t.statusId || prior.status !== t.status) {
        tasksStatusChanged.push({
          id,
          title: t.title,
          from: prior.statusId ?? prior.status,
          to: t.statusId ?? t.status,
        })
      }
    }
    for (const [id, t] of baselineTasks) {
      if (!currentTasks.has(id)) {
        tasksRemoved.push({ id, title: t.title, from: t.statusId ?? t.status })
      }
    }

    // Diff issues
    const baselineIssues = new Map(baseline.issueStatuses.map((i) => [i.id, i]))
    const currentIssues = new Map(current.issueStatuses.map((i) => [i.id, i]))

    const issuesAdded: RecapDiffEntry[] = []
    const issuesResolved: RecapDiffEntry[] = []
    const issuesStatusChanged: RecapDiffEntry[] = []
    const issuesSeverityChanged: RecapDiffEntry[] = []

    for (const [id, i] of currentIssues) {
      const prior = baselineIssues.get(id)
      if (!prior) {
        issuesAdded.push({ id, title: i.title, to: i.severity })
      } else {
        const wasOpen = prior.status === "pending" || prior.status === "in_progress"
        const isOpen = i.status === "pending" || i.status === "in_progress"
        if (wasOpen && !isOpen) {
          issuesResolved.push({ id, title: i.title, from: prior.status, to: i.status })
        } else if (prior.status !== i.status) {
          issuesStatusChanged.push({ id, title: i.title, from: prior.status, to: i.status })
        }
        if (prior.severity !== i.severity) {
          issuesSeverityChanged.push({
            id,
            title: i.title,
            from: prior.severity,
            to: i.severity,
          })
        }
      }
    }

    const previousOpen = baseline.counts.issues.pending + baseline.counts.issues.inProgress
    const currentOpen = current.counts.issues.pending + current.counts.issues.inProgress
    const delta = currentOpen - previousOpen
    const growthRatio = previousOpen > 0 ? delta / previousOpen : 0

    const memoriesAdded = Math.max(
      0,
      current.counts.memories.total - baseline.counts.memories.total
    )
    const memoriesDeprecated = Math.max(
      0,
      current.counts.memories.deprecated - baseline.counts.memories.deprecated
    )

    const result: RecapResult = {
      hasBaseline: true,
      baselineSnapshotId: baseline._id,
      baselineCreatedAt: baseline.createdAt,
      baselineGitHead: baseline.gitHead ?? null,
      currentGitHead: null,
      scope,
      tasks: {
        added: tasksAdded,
        removed: tasksRemoved,
        statusChanged: tasksStatusChanged,
      },
      issues: {
        added: issuesAdded,
        resolved: issuesResolved,
        statusChanged: issuesStatusChanged,
        severityChanged: issuesSeverityChanged,
      },
      memories: {
        addedCount: memoriesAdded,
        deprecatedCount: memoriesDeprecated,
      },
      debt: {
        previousOpenIssues: previousOpen,
        currentOpenIssues: currentOpen,
        delta,
        growthRatio,
      },
      markdown: "",
    }

    return {
      ...result,
      markdown: includeMarkdown ? renderRecap(result, false) : "",
    }
  },
})

function renderRecap(result: RecapResult, isFirstSession: boolean): string {
  if (isFirstSession) {
    const lines = ["## Recap", "", "First session — no prior snapshot to diff against."]
    if (result.memories.addedCount > 0) {
      lines.push("", `${result.memories.addedCount} active memories on file.`)
    }
    if (result.debt.currentOpenIssues > 0) {
      lines.push(`${result.debt.currentOpenIssues} open issues.`)
    }
    return lines.join("\n")
  }

  const lines: string[] = ["## Recap"]
  const baselineDate = result.baselineCreatedAt
    ? new Date(result.baselineCreatedAt).toISOString().slice(0, 16).replace("T", " ")
    : "(unknown)"
  lines.push("", `Since last snapshot (${baselineDate} UTC):`)

  // Tasks
  const tParts: string[] = []
  if (result.tasks.added.length > 0) tParts.push(`${result.tasks.added.length} added`)
  if (result.tasks.statusChanged.length > 0)
    tParts.push(`${result.tasks.statusChanged.length} status-changed`)
  if (result.tasks.removed.length > 0) tParts.push(`${result.tasks.removed.length} removed`)
  if (tParts.length > 0) {
    lines.push("", `**Tasks:** ${tParts.join(", ")}.`)
    for (const t of result.tasks.statusChanged.slice(0, 5)) {
      lines.push(`- ${t.title}: ${t.from} → ${t.to}`)
    }
  }

  // Issues
  const iParts: string[] = []
  if (result.issues.added.length > 0) iParts.push(`${result.issues.added.length} new`)
  if (result.issues.resolved.length > 0) iParts.push(`${result.issues.resolved.length} resolved`)
  if (iParts.length > 0) {
    lines.push("", `**Issues:** ${iParts.join(", ")}.`)
    for (const i of result.issues.resolved.slice(0, 5)) {
      lines.push(`- Resolved: ${i.title}`)
    }
  }

  // Memories
  if (result.memories.addedCount > 0 || result.memories.deprecatedCount > 0) {
    const mParts: string[] = []
    if (result.memories.addedCount > 0) mParts.push(`${result.memories.addedCount} new`)
    if (result.memories.deprecatedCount > 0)
      mParts.push(`${result.memories.deprecatedCount} deprecated`)
    lines.push("", `**Memories:** ${mParts.join(", ")}.`)
  }

  // Debt trend
  if (result.debt.delta !== 0) {
    const dir = result.debt.delta > 0 ? "↑" : "↓"
    const pct =
      result.debt.previousOpenIssues > 0 ? ` (${(result.debt.growthRatio * 100).toFixed(0)}%)` : ""
    lines.push(
      "",
      `**Debt:** ${dir} open issues ${result.debt.previousOpenIssues} → ${result.debt.currentOpenIssues}${pct}.`
    )
  }

  if (
    result.tasks.added.length +
      result.tasks.statusChanged.length +
      result.tasks.removed.length +
      result.issues.added.length +
      result.issues.resolved.length +
      result.memories.addedCount +
      result.memories.deprecatedCount ===
    0
  ) {
    lines.push("", "No changes since last snapshot.")
  }

  return lines.join("\n")
}
