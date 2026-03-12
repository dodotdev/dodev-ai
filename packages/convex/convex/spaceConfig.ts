import { ConvexError, v } from "convex/values"
import { mutation } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"
import { generateConfigId } from "./lib/utils"

const statusCategoryValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled")
)

/** Update all workflow statuses for a space */
export const updateStatuses = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    statuses: v.array(
      v.object({
        id: v.optional(v.string()),
        name: v.string(),
        category: statusCategoryValidator,
        color: v.string(),
        position: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    if (args.statuses.length > 20) {
      throw new ConvexError("VALIDATION_ERROR")
    }

    // Ensure all 4 categories are covered
    const categories = new Set(args.statuses.map((s) => s.category))
    for (const required of ["pending", "in_progress", "completed", "cancelled"] as const) {
      if (!categories.has(required)) {
        throw new ConvexError("VALIDATION_ERROR")
      }
    }

    // Assign IDs to new statuses
    const statuses = args.statuses.map((s) => ({
      id: s.id || generateConfigId("st"),
      name: s.name,
      category: s.category,
      color: s.color,
      position: s.position,
    }))

    const validIds = new Set(statuses.map((s) => s.id))

    // Clear orphaned statusId refs on tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId))
      .collect()

    for (const task of tasks) {
      if (task.statusId && !validIds.has(task.statusId)) {
        await ctx.db.patch(task._id, { statusId: undefined, updatedAt: Date.now() })
      }
    }

    await ctx.db.patch(args.spaceId, { statuses, updatedAt: Date.now() })
    return await ctx.db.get(args.spaceId)
  },
})

/** Add a label to a space */
export const addLabel = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    if (space.labels.length >= 50) {
      throw new ConvexError("VALIDATION_ERROR")
    }

    const label = { id: generateConfigId("lb"), name: args.name, color: args.color }
    await ctx.db.patch(args.spaceId, {
      labels: [...space.labels, label],
      updatedAt: Date.now(),
    })
    return label
  },
})

/** Remove a label from a space */
export const removeLabel = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    labelId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const labels = space.labels.filter((l) => l.id !== args.labelId)
    await ctx.db.patch(args.spaceId, { labels, updatedAt: Date.now() })

    // Clear labelIds refs from tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId))
      .collect()

    for (const task of tasks) {
      if (task.labelIds?.includes(args.labelId)) {
        const newLabelIds = task.labelIds.filter((id) => id !== args.labelId)
        await ctx.db.patch(task._id, {
          labelIds: newLabelIds.length > 0 ? newLabelIds : undefined,
          updatedAt: Date.now(),
        })
      }
    }

    return { deleted: true }
  },
})

/** Update a label in a space */
export const updateLabel = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    labelId: v.string(),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const labels = space.labels.map((l) => {
      if (l.id !== args.labelId) return l
      return {
        ...l,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.color !== undefined ? { color: args.color } : {}),
      }
    })

    await ctx.db.patch(args.spaceId, { labels, updatedAt: Date.now() })
    return labels.find((l) => l.id === args.labelId)
  },
})

/** Add a member to a space */
export const addMember = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    name: v.string(),
    role: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    if (space.members.length >= 50) {
      throw new ConvexError("VALIDATION_ERROR")
    }

    const member = {
      id: generateConfigId("mb"),
      name: args.name,
      role: args.role,
      avatarUrl: args.avatarUrl,
    }
    await ctx.db.patch(args.spaceId, {
      members: [...space.members, member],
      updatedAt: Date.now(),
    })
    return member
  },
})

/** Remove a member from a space */
export const removeMember = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const members = space.members.filter((m) => m.id !== args.memberId)
    await ctx.db.patch(args.spaceId, { members, updatedAt: Date.now() })

    // Clear assigneeId refs from tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId))
      .collect()

    for (const task of tasks) {
      if (task.assigneeId === args.memberId) {
        await ctx.db.patch(task._id, { assigneeId: undefined, updatedAt: Date.now() })
      }
    }

    return { deleted: true }
  },
})

/** Update a member in a space */
export const updateMember = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    memberId: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const members = space.members.map((m) => {
      if (m.id !== args.memberId) return m
      return {
        ...m,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.role !== undefined ? { role: args.role } : {}),
        ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl ?? undefined } : {}),
      }
    })

    await ctx.db.patch(args.spaceId, { members, updatedAt: Date.now() })
    return members.find((m) => m.id === args.memberId)
  },
})

/** Update estimate scale for a space */
export const updateEstimateScale = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    type: v.union(v.literal("points"), v.literal("tshirt"), v.literal("hours")),
    values: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const estimateScale = { type: args.type, values: args.values }

    // If scale type changed, clear estimates from tasks
    if (space.estimateScale.type !== args.type) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId))
        .collect()

      for (const task of tasks) {
        if (task.estimate) {
          await ctx.db.patch(task._id, { estimate: undefined, updatedAt: Date.now() })
        }
      }
    }

    await ctx.db.patch(args.spaceId, { estimateScale, updatedAt: Date.now() })
    return estimateScale
  },
})

/** Update memory settings for a space or user */
export const updateMemorySettings = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    // Space-level settings
    autoCapture: v.optional(v.boolean()),
    defaultTags: v.optional(v.array(v.string())),
    memoryInstructions: v.optional(v.string()),
    // User-level settings (only when no spaceId)
    embeddingProvider: v.optional(v.string()),
    embeddingModel: v.optional(v.string()),
    embeddingBaseUrl: v.optional(v.string()),
    embeddingApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    if (args.spaceId) {
      // Update space-level memory settings
      const space = await ctx.db.get(args.spaceId)
      if (!space || space.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }

      const existing = space.memorySettings ?? {}
      const memorySettings = {
        ...existing,
        ...(args.autoCapture !== undefined ? { autoCapture: args.autoCapture } : {}),
        ...(args.defaultTags !== undefined ? { defaultTags: args.defaultTags } : {}),
        ...(args.memoryInstructions !== undefined
          ? { memoryInstructions: args.memoryInstructions }
          : {}),
      }

      await ctx.db.patch(args.spaceId, { memorySettings, updatedAt: Date.now() })
      return { memorySettings }
    }

    // Update user-level memory settings
    const existing = user.memorySettings ?? {}
    const memorySettings = {
      ...existing,
      ...(args.autoCapture !== undefined ? { autoCapture: args.autoCapture } : {}),
      ...(args.embeddingProvider !== undefined
        ? { embeddingProvider: args.embeddingProvider }
        : {}),
      ...(args.embeddingModel !== undefined ? { embeddingModel: args.embeddingModel } : {}),
      ...(args.embeddingBaseUrl !== undefined ? { embeddingBaseUrl: args.embeddingBaseUrl } : {}),
      ...(args.embeddingApiKey !== undefined ? { embeddingApiKey: args.embeddingApiKey } : {}),
    }

    await ctx.db.patch(user._id, { memorySettings, updatedAt: Date.now() })
    return { memorySettings }
  },
})

/** Update AI persona for a space */
export const updatePersona = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    systemPrompt: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const persona =
      args.systemPrompt && args.systemPrompt.trim()
        ? { systemPrompt: args.systemPrompt.trim() }
        : undefined

    await ctx.db.patch(args.spaceId, { persona, updatedAt: Date.now() })
    return { persona }
  },
})
