import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

/** Write an MCP tool call log entry */
export const write = mutation({
  args: {
    apiKeyHash: v.string(),
    tool: v.string(),
    args: v.optional(v.any()),
    status: v.union(v.literal("ok"), v.literal("error")),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.number(),
    projectId: v.optional(v.string()),
    spaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await ctx.db.insert("mcpLogs", {
      userId: user._id,
      tool: args.tool,
      args: args.args,
      status: args.status,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      durationMs: args.durationMs,
      projectId: args.projectId,
      spaceId: args.spaceId,
      createdAt: Date.now(),
    })
  },
})

/** List recent MCP logs for the authenticated user */
export const list = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 50, 200)

    // Prefer spaceId, fall back to projectId for backward compat
    const filterSpaceId = args.spaceId ?? args.projectId

    if (filterSpaceId) {
      // Try space index first, fall back to project index
      if (args.spaceId) {
        return await ctx.db
          .query("mcpLogs")
          .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId))
          .order("desc")
          .take(limit)
      }
      return await ctx.db
        .query("mcpLogs")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId)
        )
        .order("desc")
        .take(limit)
    }

    return await ctx.db
      .query("mcpLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit)
  },
})

/** Delete logs older than 7 days. Called by cron. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const old = await ctx.db
      .query("mcpLogs")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .take(500)

    for (const log of old) {
      await ctx.db.delete(log._id)
    }

    return { deleted: old.length }
  },
})
