/**
 * Reviews (R4) — second-AI verdicts on plans / diffs.
 *
 * The first agent calls request_review with the artifact (plan markdown
 * or diff) and a stage. A Convex action calls the Anthropic Messages API
 * with a structured-output prompt; the verdict is stored alongside any
 * task/issue/scope and made available to complete_task gating.
 */

import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"
import { DEFAULT_REVIEWER_MODEL, getEnvReviewerConfig, runReview } from "./lib/reviewer"

const reviewerSettingsValidator = v.object({
  apiKey: v.optional(v.union(v.string(), v.null())),
  model: v.optional(v.union(v.string(), v.null())),
  baseUrl: v.optional(v.union(v.string(), v.null())),
})

/** Source of a resolved reviewer field — for diagnostics. */
type ResolutionSource = "project" | "space" | "user" | "env" | "default"

const stageValidator = v.union(v.literal("plan"), v.literal("code"), v.literal("ad_hoc"))

const verdictValidator = v.union(
  v.literal("approve"),
  v.literal("approve_with_suggestions"),
  v.literal("needs_revision"),
  v.literal("blocker"),
  v.literal("error")
)

/**
 * Internal — auth from action context. Mirrors the embeddings pattern.
 */
export const authenticateForAction = internalQuery({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_api_key_hash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .unique()
  },
})

/**
 * Internal — walk project -> space -> user looking for reviewerSettings.
 * Returns the first set value for each field separately (apiKey, model,
 * baseUrl can each come from a different scope).
 *
 * The env fallback is applied later in the action (queries can't read
 * process.env safely in all Convex runtimes).
 *
 * Future: when teams ship, slot a `team` rung between space and user.
 */
export const resolveReviewerScopes = internalQuery({
  args: {
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const out: {
      apiKey?: string
      apiKeySource?: ResolutionSource
      model?: string
      modelSource?: ResolutionSource
      baseUrl?: string
      baseUrlSource?: ResolutionSource
      // Legacy: requireReview.reviewerModel (R4 path) is still honored on
      // the model rung — same precedence as reviewerSettings.model.
      legacyModel?: string
      legacyModelSource?: ResolutionSource
    } = {}

    const set = (
      source: ResolutionSource,
      settings: { apiKey?: string; model?: string; baseUrl?: string } | undefined,
      legacyModel?: string
    ) => {
      if (out.apiKey === undefined && settings?.apiKey) {
        out.apiKey = settings.apiKey
        out.apiKeySource = source
      }
      if (out.model === undefined && settings?.model) {
        out.model = settings.model
        out.modelSource = source
      }
      if (out.baseUrl === undefined && settings?.baseUrl) {
        out.baseUrl = settings.baseUrl
        out.baseUrlSource = source
      }
      if (out.legacyModel === undefined && legacyModel) {
        out.legacyModel = legacyModel
        out.legacyModelSource = source
      }
    }

    // Project rung — highest precedence.
    let parentSpaceId: Id<"spaces"> | undefined
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (project && project.userId === args.userId) {
        set(
          "project",
          project.reviewerSettings as
            | { apiKey?: string; model?: string; baseUrl?: string }
            | undefined,
          project.requireReview?.reviewerModel
        )
        parentSpaceId = project.spaceId
      }
    }

    // Space rung. If only projectId was passed, fall back to its parent space.
    const spaceId = args.spaceId ?? parentSpaceId
    if (spaceId) {
      const space = await ctx.db.get(spaceId)
      if (space && space.userId === args.userId) {
        set(
          "space",
          space.reviewerSettings as
            | { apiKey?: string; model?: string; baseUrl?: string }
            | undefined,
          space.requireReview?.reviewerModel
        )
      }
    }

    // User rung — broadest scope.
    const user = await ctx.db.get(args.userId)
    if (user) {
      set(
        "user",
        user.reviewerSettings as { apiKey?: string; model?: string; baseUrl?: string } | undefined
      )
    }

    return out
  },
})

/** Internal — store the finished review row. */
export const writeReview = internalMutation({
  args: {
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
    stage: stageValidator,
    artifact: v.string(),
    context: v.optional(v.string()),
    reviewerModel: v.string(),
    verdict: verdictValidator,
    summary: v.string(),
    findings: v.array(
      v.object({
        category: v.string(),
        severity: v.union(
          v.literal("critical"),
          v.literal("major"),
          v.literal("minor"),
          v.literal("suggestion")
        ),
        title: v.string(),
        description: v.string(),
        location: v.optional(v.string()),
      })
    ),
    durationMs: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("reviews", {
      ...args,
      lenses: ["general"],
      createdAt: Date.now(),
    })
    return await ctx.db.get(id)
  },
})

/**
 * Public action — run a review and persist the verdict.
 * Action because it calls the Anthropic API.
 */
export const request = action({
  args: {
    apiKeyHash: v.string(),
    stage: stageValidator,
    artifact: v.string(),
    context: v.optional(v.string()),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
    /** Override the reviewer model (defaults to project/space config or env). */
    reviewerModel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"reviews"> | null> => {
    const user = await ctx.runQuery(internal.reviews.authenticateForAction, {
      apiKeyHash: args.apiKeyHash,
    })
    if (!user) throw new ConvexError("UNAUTHORIZED")

    if (!args.artifact?.trim()) {
      throw new ConvexError("artifact is required and must be non-empty.")
    }

    // Walk project -> space -> user for each field independently.
    const scoped = await ctx.runQuery(internal.reviews.resolveReviewerScopes, {
      userId: user._id,
      spaceId: args.spaceId,
      projectId: args.projectId,
    })
    const env = getEnvReviewerConfig()

    const apiKey = scoped.apiKey ?? env.apiKey
    if (!apiKey) {
      throw new ConvexError(
        "REVIEWER_KEY_MISSING: No reviewer API key found at project, space, or user scope, and ANTHROPIC_API_KEY is not set in Convex env. Use set_*_reviewer_settings to configure one, or set the env var on the deployment."
      )
    }

    const reviewerModel =
      args.reviewerModel ??
      scoped.model ??
      scoped.legacyModel ??
      env.model ??
      DEFAULT_REVIEWER_MODEL

    const baseUrl = scoped.baseUrl ?? env.baseUrl

    const start = Date.now()
    let verdict: "approve" | "approve_with_suggestions" | "needs_revision" | "blocker" | "error" =
      "error"
    let summary = ""
    let findings: Array<{
      category: string
      severity: "critical" | "major" | "minor" | "suggestion"
      title: string
      description: string
      location?: string
    }> = []
    let errorMessage: string | undefined

    try {
      const result = await runReview({
        stage: args.stage,
        artifact: args.artifact,
        context: args.context,
        reviewerModel,
        apiKey,
        baseUrl,
      })
      verdict = result.verdict
      summary = result.summary
      findings = result.findings
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      verdict = "error"
      summary = `Reviewer call failed: ${errorMessage}`
    }

    const stored = await ctx.runMutation(internal.reviews.writeReview, {
      userId: user._id,
      spaceId: args.spaceId,
      projectId: args.projectId,
      taskId: args.taskId,
      issueId: args.issueId,
      stage: args.stage,
      artifact: args.artifact,
      context: args.context,
      reviewerModel,
      verdict,
      summary,
      findings,
      durationMs: Date.now() - start,
      errorMessage,
    })

    return stored
  },
})

/** Review history for a task. Newest first. */
export const listForTask = query({
  args: { apiKeyHash: v.string(), taskId: v.id("tasks"), stage: v.optional(stageValidator) },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const q = ctx.db
      .query("reviews")
      .withIndex("by_user_task", (q) => q.eq("userId", user._id).eq("taskId", args.taskId))
      .order("desc")

    const rows = await q.collect()
    if (args.stage) return rows.filter((r) => r.stage === args.stage)
    return rows
  },
})

/** Most recent review per stage for a task — used by complete_task gating. */
export const latestForTask = query({
  args: { apiKeyHash: v.string(), taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_user_task", (q) => q.eq("userId", user._id).eq("taskId", args.taskId))
      .order("desc")
      .collect()

    const result: { plan?: (typeof rows)[number]; code?: (typeof rows)[number] } = {}
    for (const row of rows) {
      if (row.stage === "plan" && !result.plan) result.plan = row
      if (row.stage === "code" && !result.code) result.code = row
      if (result.plan && result.code) break
    }
    return result
  },
})

export const get = query({
  args: { apiKeyHash: v.string(), id: v.id("reviews") },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const row = await ctx.db.get(args.id)
    if (!row || row.userId !== user._id) throw new ConvexError("NOT_FOUND")
    return row
  },
})

// ---------------------------------------------------------------------------
// R4.1 — Reviewer settings mutations + diagnostics
//
// Three siblings — one per scope — keep the auth boundary explicit. A
// single "set_reviewer_settings({ scope })" tool would look smaller but
// would push the agent into checking ownership across types.
// ---------------------------------------------------------------------------

function applyPatch(
  current: { apiKey?: string; model?: string; baseUrl?: string } | undefined,
  patch: { apiKey?: string | null; model?: string | null; baseUrl?: string | null }
): { apiKey?: string; model?: string; baseUrl?: string } | undefined {
  const merged: { apiKey?: string; model?: string; baseUrl?: string } = { ...(current ?? {}) }
  if (patch.apiKey !== undefined) {
    if (patch.apiKey === null) delete merged.apiKey
    else merged.apiKey = patch.apiKey
  }
  if (patch.model !== undefined) {
    if (patch.model === null) delete merged.model
    else merged.model = patch.model
  }
  if (patch.baseUrl !== undefined) {
    if (patch.baseUrl === null) delete merged.baseUrl
    else merged.baseUrl = patch.baseUrl
  }
  // If the merged object has no fields, drop the wrapper entirely.
  if (merged.apiKey === undefined && merged.model === undefined && merged.baseUrl === undefined) {
    return undefined
  }
  return merged
}

/** User-level reviewer settings. Lowest-precedence scope (after env). */
export const setUserReviewerSettings = mutation({
  args: {
    apiKeyHash: v.string(),
    settings: reviewerSettingsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const next = applyPatch(user.reviewerSettings, args.settings)
    await ctx.db.patch(user._id, {
      reviewerSettings: next,
      updatedAt: Date.now(),
    })
    return { configured: !!next?.apiKey, model: next?.model, baseUrl: next?.baseUrl }
  },
})

/** Space-level reviewer settings. Shared across everyone with space access. */
export const setSpaceReviewerSettings = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    settings: reviewerSettingsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) throw new ConvexError("NOT_FOUND")

    const next = applyPatch(space.reviewerSettings, args.settings)
    await ctx.db.patch(args.spaceId, {
      reviewerSettings: next,
      updatedAt: Date.now(),
    })
    return { configured: !!next?.apiKey, model: next?.model, baseUrl: next?.baseUrl }
  },
})

/** Project-level reviewer settings. Highest-precedence scope. */
export const setProjectReviewerSettings = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    settings: reviewerSettingsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) throw new ConvexError("NOT_FOUND")

    const next = applyPatch(project.reviewerSettings, args.settings)
    await ctx.db.patch(args.projectId, {
      reviewerSettings: next,
      updatedAt: Date.now(),
    })
    return { configured: !!next?.apiKey, model: next?.model, baseUrl: next?.baseUrl }
  },
})

/**
 * Show the effective reviewer config for a scope without leaking the key.
 * Returns where each field came from (project / space / user / env / default).
 */
export const effectiveReviewerSettings = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    // Inline-walk the chain (cannot call internal queries from a public query
    // with the same auth without auth-boundary friction; reproduce the
    // walker here for read-only display).
    let parentSpaceId: Id<"spaces"> | undefined
    type Scope = "project" | "space" | "user"
    const collect: Record<"apiKey" | "model" | "baseUrl", { value: string; source: Scope } | null> =
      { apiKey: null, model: null, baseUrl: null }

    const consider = (
      source: Scope,
      settings: { apiKey?: string; model?: string; baseUrl?: string } | undefined
    ) => {
      if (!settings) return
      if (!collect.apiKey && settings.apiKey) {
        collect.apiKey = { value: settings.apiKey, source }
      }
      if (!collect.model && settings.model) {
        collect.model = { value: settings.model, source }
      }
      if (!collect.baseUrl && settings.baseUrl) {
        collect.baseUrl = { value: settings.baseUrl, source }
      }
    }

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (project && project.userId === user._id) {
        consider("project", project.reviewerSettings as never)
        parentSpaceId = project.spaceId
      }
    }
    const spaceId = args.spaceId ?? parentSpaceId
    if (spaceId) {
      const space = await ctx.db.get(spaceId)
      if (space && space.userId === user._id) {
        consider("space", space.reviewerSettings as never)
      }
    }
    consider("user", user.reviewerSettings as never)

    // Env fallback for diagnostics — we only report whether it's set, never the value.
    const env = getEnvReviewerConfig()
    const envHasKey = !!env.apiKey

    return {
      hasKey: !!collect.apiKey || envHasKey,
      apiKeySource: collect.apiKey?.source ?? (envHasKey ? "env" : null),
      // Never return the resolved key. The dashboard / agent can see whether
      // it's configured but cannot read it back out.
      model: collect.model?.value ?? env.model ?? DEFAULT_REVIEWER_MODEL,
      modelSource: collect.model?.source ?? (env.model ? "env" : "default"),
      baseUrl: collect.baseUrl?.value ?? env.baseUrl ?? null,
      baseUrlSource: collect.baseUrl?.source ?? (env.baseUrl ? "env" : null),
    }
  },
})

/** Resolve the effective requireReview policy for a task — used by complete_task. */
export async function resolveRequireReview(
  ctx: QueryCtx,
  userId: Id<"users">,
  task: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<{ plan: boolean; code: boolean }> {
  let plan = false
  let code = false

  if (task.spaceId) {
    const space = await ctx.db.get(task.spaceId)
    if (space && space.userId === userId && space.requireReview) {
      plan = !!space.requireReview.plan
      code = !!space.requireReview.code
    }
  }

  if (task.projectId) {
    const project = await ctx.db.get(task.projectId)
    if (project && project.userId === userId && project.requireReview) {
      // Project overrides space — treat undefined as "use space value".
      if (project.requireReview.plan !== undefined) plan = !!project.requireReview.plan
      if (project.requireReview.code !== undefined) code = !!project.requireReview.code
    }
  }

  return { plan, code }
}
