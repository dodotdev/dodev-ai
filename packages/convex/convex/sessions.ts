import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

export const setActiveProject = mutation({
  args: {
    apiKeyHash: v.string(),
    agentId: v.string(),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_user_agent", (q) => q.eq("userId", user._id).eq("agentId", args.agentId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeProjectId: args.projectId ?? undefined,
        lastActiveAt: Date.now(),
      })
      return await ctx.db.get(existing._id)
    }

    const id = await ctx.db.insert("sessions", {
      userId: user._id,
      agentId: args.agentId,
      activeProjectId: args.projectId ?? undefined,
      lastActiveAt: Date.now(),
    })
    return await ctx.db.get(id)
  },
})

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

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeSpaceId: args.spaceId ?? undefined,
        lastActiveAt: Date.now(),
      })
      return await ctx.db.get(existing._id)
    }

    const id = await ctx.db.insert("sessions", {
      userId: user._id,
      agentId: args.agentId,
      activeSpaceId: args.spaceId ?? undefined,
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
