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

/** Update all workflow statuses for a project */
export const updateStatuses = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
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
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
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

    // Clear orphaned statusId refs on todos
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId)
      )
      .collect()

    for (const todo of todos) {
      if (todo.statusId && !validIds.has(todo.statusId)) {
        await ctx.db.patch(todo._id, { statusId: undefined, updatedAt: Date.now() })
      }
    }

    await ctx.db.patch(args.projectId, { statuses, updatedAt: Date.now() })
    return await ctx.db.get(args.projectId)
  },
})

/** Add a label to a project */
export const addLabel = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    if (project.labels.length >= 50) {
      throw new ConvexError("VALIDATION_ERROR")
    }

    const label = { id: generateConfigId("lb"), name: args.name, color: args.color }
    await ctx.db.patch(args.projectId, {
      labels: [...project.labels, label],
      updatedAt: Date.now(),
    })
    return label
  },
})

/** Remove a label from a project */
export const removeLabel = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    labelId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const labels = project.labels.filter((l) => l.id !== args.labelId)
    await ctx.db.patch(args.projectId, { labels, updatedAt: Date.now() })

    // Clear labelIds refs from todos
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId)
      )
      .collect()

    for (const todo of todos) {
      if (todo.labelIds?.includes(args.labelId)) {
        const newLabelIds = todo.labelIds.filter((id) => id !== args.labelId)
        await ctx.db.patch(todo._id, {
          labelIds: newLabelIds.length > 0 ? newLabelIds : undefined,
          updatedAt: Date.now(),
        })
      }
    }

    return { deleted: true }
  },
})

/** Update a label */
export const updateLabel = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    labelId: v.string(),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const labels = project.labels.map((l) => {
      if (l.id !== args.labelId) return l
      return {
        ...l,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.color !== undefined ? { color: args.color } : {}),
      }
    })

    await ctx.db.patch(args.projectId, { labels, updatedAt: Date.now() })
    return labels.find((l) => l.id === args.labelId)
  },
})

/** Add a member to a project */
export const addMember = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    name: v.string(),
    role: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    if (project.members.length >= 50) {
      throw new ConvexError("VALIDATION_ERROR")
    }

    const member = {
      id: generateConfigId("mb"),
      name: args.name,
      role: args.role,
      avatarUrl: args.avatarUrl,
    }
    await ctx.db.patch(args.projectId, {
      members: [...project.members, member],
      updatedAt: Date.now(),
    })
    return member
  },
})

/** Remove a member from a project */
export const removeMember = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const members = project.members.filter((m) => m.id !== args.memberId)
    await ctx.db.patch(args.projectId, { members, updatedAt: Date.now() })

    // Clear assigneeId refs from todos
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId)
      )
      .collect()

    for (const todo of todos) {
      if (todo.assigneeId === args.memberId) {
        await ctx.db.patch(todo._id, { assigneeId: undefined, updatedAt: Date.now() })
      }
    }

    return { deleted: true }
  },
})

/** Update a member */
export const updateMember = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    memberId: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const members = project.members.map((m) => {
      if (m.id !== args.memberId) return m
      return {
        ...m,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.role !== undefined ? { role: args.role } : {}),
        ...(args.avatarUrl !== undefined
          ? { avatarUrl: args.avatarUrl ?? undefined }
          : {}),
      }
    })

    await ctx.db.patch(args.projectId, { members, updatedAt: Date.now() })
    return members.find((m) => m.id === args.memberId)
  },
})

/** Update estimate scale for a project */
export const updateEstimateScale = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    type: v.union(v.literal("points"), v.literal("tshirt"), v.literal("hours")),
    values: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const estimateScale = { type: args.type, values: args.values }

    // If scale type changed, clear estimates from todos
    if (project.estimateScale.type !== args.type) {
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId)
        )
        .collect()

      for (const todo of todos) {
        if (todo.estimate) {
          await ctx.db.patch(todo._id, { estimate: undefined, updatedAt: Date.now() })
        }
      }
    }

    await ctx.db.patch(args.projectId, { estimateScale, updatedAt: Date.now() })
    return estimateScale
  },
})

/** Update AI persona for a project */
export const updatePersona = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    systemPrompt: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const persona =
      args.systemPrompt && args.systemPrompt.trim()
        ? { systemPrompt: args.systemPrompt.trim() }
        : undefined

    await ctx.db.patch(args.projectId, { persona, updatedAt: Date.now() })
    return { persona }
  },
})
