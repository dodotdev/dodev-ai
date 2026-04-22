import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

/**
 * Set the active space for a given agent. Clears `activeProjectId` whenever
 * the space changes (a project always belongs to exactly one space).
 */
export const setActiveSpace = mutation({
  args: {
    apiKeyHash: v.string(),
    agentId: v.string(),
    spaceId: v.optional(v.union(v.id("spaces"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_user_agent", (q) => q.eq("userId", user._id).eq("agentId", args.agentId))
      .unique()

    const nextSpace = args.spaceId ?? undefined
    const clearProject = existing?.activeSpaceId !== nextSpace

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeSpaceId: nextSpace,
        ...(clearProject ? { activeProjectId: undefined } : {}),
        lastActiveAt: Date.now(),
      })
      return await ctx.db.get(existing._id)
    }

    const id = await ctx.db.insert("sessions", {
      userId: user._id,
      agentId: args.agentId,
      activeSpaceId: nextSpace,
      lastActiveAt: Date.now(),
    })
    return await ctx.db.get(id)
  },
})

/**
 * Set the active project for a given agent. Passing `projectId = null` clears
 * it. When a project is set, the session's `activeSpaceId` is auto-aligned to
 * the project's parent space (even if the agent previously pointed at a
 * different space).
 */
export const setActiveProject = mutation({
  args: {
    apiKeyHash: v.string(),
    agentId: v.string(),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    let nextSpaceId: import("./_generated/dataModel").Id<"spaces"> | undefined
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (!project || project.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      nextSpaceId = project.spaceId
    }

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_user_agent", (q) => q.eq("userId", user._id).eq("agentId", args.agentId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeProjectId: args.projectId ?? undefined,
        ...(nextSpaceId ? { activeSpaceId: nextSpaceId } : {}),
        lastActiveAt: Date.now(),
      })
      return await ctx.db.get(existing._id)
    }

    const id = await ctx.db.insert("sessions", {
      userId: user._id,
      agentId: args.agentId,
      activeSpaceId: nextSpaceId,
      activeProjectId: args.projectId ?? undefined,
      lastActiveAt: Date.now(),
    })
    return await ctx.db.get(id)
  },
})

export const getSession = query({
  args: {
    apiKeyHash: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    return await ctx.db
      .query("sessions")
      .withIndex("by_user_agent", (q) => q.eq("userId", user._id).eq("agentId", args.agentId))
      .unique()
  },
})
