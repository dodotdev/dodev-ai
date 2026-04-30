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
import { action, internalMutation, internalQuery, type QueryCtx, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"
import { getReviewerConfig, runReview } from "./lib/reviewer"

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

/** Internal — resolve the effective reviewer model for a scope. */
export const resolveReviewerConfig = internalQuery({
  args: {
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    let projectModel: string | undefined
    let spaceModel: string | undefined

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (project && project.userId === args.userId) {
        projectModel = project.requireReview?.reviewerModel
        if (!args.spaceId && !spaceModel) {
          const space = await ctx.db.get(project.spaceId)
          spaceModel = space?.requireReview?.reviewerModel
        }
      }
    }
    if (args.spaceId) {
      const space = await ctx.db.get(args.spaceId)
      if (space && space.userId === args.userId) {
        spaceModel = space.requireReview?.reviewerModel
      }
    }

    return { projectModel, spaceModel }
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

    const config = getReviewerConfig()
    if (!config.apiKey) {
      throw new ConvexError(
        "Reviewer API key not configured. Set ANTHROPIC_API_KEY (or REVIEWER_API_KEY) in Convex env."
      )
    }

    const scopeConfig = await ctx.runQuery(internal.reviews.resolveReviewerConfig, {
      userId: user._id,
      spaceId: args.spaceId,
      projectId: args.projectId,
    })

    const reviewerModel =
      args.reviewerModel ??
      scopeConfig.projectModel ??
      scopeConfig.spaceModel ??
      config.defaultModel

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
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
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
