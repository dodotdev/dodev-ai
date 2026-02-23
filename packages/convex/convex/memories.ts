import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey, checkQuota } from "./lib/auth"
import { incrementUsage } from "./lib/utils"

export const add = mutation({
  args: {
    apiKeyHash: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    projectId: v.optional(v.id("projects")),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await checkQuota(ctx, user, "memories")

    const now = Date.now()
    const id = await ctx.db.insert("memories", {
      userId: user._id,
      projectId: args.projectId,
      content: args.content,
      tags: args.tags ?? [],
      source: args.source,
      createdAt: now,
      updatedAt: now,
    })

    await incrementUsage(ctx, user._id, "memoryCount")
    return await ctx.db.get(id)
  },
})

export const search = query({
  args: {
    apiKeyHash: v.string(),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 10, 50)

    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query)
        search = search.eq("userId", user._id)
        if (args.projectId) search = search.eq("projectId", args.projectId)
        return search
      })
      .take(limit)

    // Filter by tags if specified
    if (args.tags && args.tags.length > 0) {
      return results.filter((m) => args.tags!.some((tag) => m.tags.includes(tag)))
    }

    return results
  },
})

export const listMemories = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 20, 100)

    let memoryQuery
    if (args.projectId) {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!)
        )
    } else {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_created", (q) => q.eq("userId", user._id))
    }

    const results = await memoryQuery.order("desc").take(limit)

    if (args.tags && args.tags.length > 0) {
      return results.filter((m) => args.tags!.some((tag) => m.tags.includes(tag)))
    }

    return results
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("memories"),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const memory = await ctx.db.get(args.id)
    if (!memory || memory.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.content !== undefined) updates.content = args.content
    if (args.tags !== undefined) updates.tags = args.tags
    if (args.projectId !== undefined) updates.projectId = args.projectId ?? undefined

    await ctx.db.patch(args.id, updates)
    return await ctx.db.get(args.id)
  },
})

export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("memories"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const memory = await ctx.db.get(args.id)
    if (!memory || memory.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})
