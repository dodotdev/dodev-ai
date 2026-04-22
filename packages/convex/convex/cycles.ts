import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    spaceId: v.optional(v.id("spaces")),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"))),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    if (!args.spaceId && !args.projectId) {
      throw new ConvexError("VALIDATION_ERROR: either spaceId or projectId is required")
    }

    // When projectId is set, the project's parent space is authoritative.
    let resolvedSpaceId = args.spaceId
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (!project || project.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      resolvedSpaceId = project.spaceId
    } else if (args.spaceId) {
      const space = await ctx.db.get(args.spaceId)
      if (!space || space.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
    }

    if (args.endDate <= args.startDate) {
      throw new ConvexError("VALIDATION_ERROR")
    }

    const now = Date.now()
    const id = await ctx.db.insert("cycles", {
      userId: user._id,
      projectId: args.projectId,
      spaceId: resolvedSpaceId,
      name: args.name,
      description: args.description,
      status: args.status ?? "upcoming",
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: now,
      updatedAt: now,
    })

    return await ctx.db.get(id)
  },
})

export const list = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    spaceId: v.optional(v.id("spaces")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    // Narrower scope wins: projectId > spaceId.
    if (args.projectId) {
      if (args.status) {
        return await ctx.db
          .query("cycles")
          .withIndex("by_user_project_status", (q) =>
            q
              .eq("userId", user._id)
              .eq("projectId", args.projectId!)
              .eq("status", args.status as "upcoming" | "active" | "completed")
          )
          .collect()
      }
      return await ctx.db
        .query("cycles")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!)
        )
        .collect()
    }

    if (args.spaceId) {
      if (args.status) {
        return await ctx.db
          .query("cycles")
          .withIndex("by_user_space_status", (q) =>
            q
              .eq("userId", user._id)
              .eq("spaceId", args.spaceId!)
              .eq("status", args.status as "upcoming" | "active" | "completed")
          )
          .collect()
      }
      return await ctx.db
        .query("cycles")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId!))
        .collect()
    }

    throw new ConvexError("VALIDATION_ERROR: either spaceId or projectId is required")
  },
})

export const get = query({
  args: {
    apiKeyHash: v.string(),
    id: v.id("cycles"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const cycle = await ctx.db.get(args.id)
    if (!cycle || cycle.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    return cycle
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("cycles"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const cycle = await ctx.db.get(args.id)
    if (!cycle || cycle.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description ?? undefined
    if (args.status !== undefined) updates.status = args.status
    if (args.startDate !== undefined) updates.startDate = args.startDate
    if (args.endDate !== undefined) updates.endDate = args.endDate

    await ctx.db.patch(args.id, updates)
    return await ctx.db.get(args.id)
  },
})

export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("cycles"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const cycle = await ctx.db.get(args.id)
    if (!cycle || cycle.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    // Clear cycleId from referencing tasks
    let tasks
    if (cycle.spaceId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_space_cycle", (q) =>
          q.eq("userId", user._id).eq("spaceId", cycle.spaceId!).eq("cycleId", args.id)
        )
        .collect()
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_project_cycle", (q) =>
          q.eq("userId", user._id).eq("projectId", cycle.projectId).eq("cycleId", args.id)
        )
        .collect()
    }

    for (const task of tasks) {
      await ctx.db.patch(task._id, { cycleId: undefined, updatedAt: Date.now() })
    }

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})
