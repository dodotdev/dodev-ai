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

/**
 * Project config model (v0.1.0+):
 *   - statuses, labels, members: copied from space at project creation; then
 *     edited independently on the project. No propagation either direction.
 *   - estimateScale, persona: undefined on project = inherit live from space.
 *     Setting a value overrides. Clearing (explicit null) resets to inherit.
 */

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------
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

    if (args.statuses.length > 20) throw new ConvexError("VALIDATION_ERROR")

    const categories = new Set(args.statuses.map((s) => s.category))
    for (const required of ["pending", "in_progress", "completed", "cancelled"] as const) {
      if (!categories.has(required)) throw new ConvexError("VALIDATION_ERROR")
    }

    const statuses = args.statuses.map((s) => ({
      id: s.id || generateConfigId("st"),
      name: s.name,
      category: s.category,
      color: s.color,
      position: s.position,
    }))

    const validIds = new Set(statuses.map((s) => s.id))

    // Clear orphaned statusId refs on this project's tasks/issues
    const now = Date.now()
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
    for (const t of tasks) {
      if (t.statusId && !validIds.has(t.statusId)) {
        await ctx.db.patch(t._id, { statusId: undefined, updatedAt: now })
      }
    }

    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
    for (const i of issues) {
      if (i.statusId && !validIds.has(i.statusId)) {
        await ctx.db.patch(i._id, { statusId: undefined, updatedAt: now })
      }
    }

    await ctx.db.patch(args.projectId, { statuses, updatedAt: now })
    return await ctx.db.get(args.projectId)
  },
})

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
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
    if (project.labels.length >= 50) throw new ConvexError("VALIDATION_ERROR")
    const label = { id: generateConfigId("lb"), name: args.name, color: args.color }
    await ctx.db.patch(args.projectId, {
      labels: [...project.labels, label],
      updatedAt: Date.now(),
    })
    return label
  },
})

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
    const labels = project.labels.map((l) =>
      l.id === args.labelId
        ? {
            ...l,
            ...(args.name !== undefined ? { name: args.name } : {}),
            ...(args.color !== undefined ? { color: args.color } : {}),
          }
        : l
    )
    await ctx.db.patch(args.projectId, { labels, updatedAt: Date.now() })
    return labels.find((l) => l.id === args.labelId) ?? null
  },
})

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

    // Scrub labelId references from project-scoped tasks/issues
    const now = Date.now()
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
    for (const t of tasks) {
      if (t.labelIds?.includes(args.labelId)) {
        await ctx.db.patch(t._id, {
          labelIds: t.labelIds.filter((id) => id !== args.labelId),
          updatedAt: now,
        })
      }
    }
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
    for (const i of issues) {
      if (i.labelIds?.includes(args.labelId)) {
        await ctx.db.patch(i._id, {
          labelIds: i.labelIds.filter((id) => id !== args.labelId),
          updatedAt: now,
        })
      }
    }

    await ctx.db.patch(args.projectId, { labels, updatedAt: now })
    return { removed: true, labelId: args.labelId }
  },
})

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
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
    if (project.members.length >= 50) throw new ConvexError("VALIDATION_ERROR")
    const member = {
      id: generateConfigId("mb"),
      name: args.name,
      role: args.role,
      ...(args.avatarUrl ? { avatarUrl: args.avatarUrl } : {}),
    }
    await ctx.db.patch(args.projectId, {
      members: [...project.members, member],
      updatedAt: Date.now(),
    })
    return member
  },
})

export const updateMember = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    memberId: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    const members = project.members.map((m) =>
      m.id === args.memberId
        ? {
            ...m,
            ...(args.name !== undefined ? { name: args.name } : {}),
            ...(args.role !== undefined ? { role: args.role } : {}),
            ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
          }
        : m
    )
    await ctx.db.patch(args.projectId, { members, updatedAt: Date.now() })
    return members.find((m) => m.id === args.memberId) ?? null
  },
})

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

    // Scrub assigneeId references
    const now = Date.now()
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
    for (const t of tasks) {
      if (t.assigneeId === args.memberId) {
        await ctx.db.patch(t._id, { assigneeId: undefined, updatedAt: now })
      }
    }
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
    for (const i of issues) {
      if (i.assigneeId === args.memberId) {
        await ctx.db.patch(i._id, { assigneeId: undefined, updatedAt: now })
      }
    }

    await ctx.db.patch(args.projectId, { members, updatedAt: now })
    return { removed: true, memberId: args.memberId }
  },
})

// ---------------------------------------------------------------------------
// Estimate scale (live-inherit; null = clear override, resume inheriting)
// ---------------------------------------------------------------------------
export const updateEstimateScale = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    scale: v.union(
      v.null(),
      v.object({
        type: v.union(v.literal("points"), v.literal("tshirt"), v.literal("hours")),
        values: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    await ctx.db.patch(args.projectId, {
      estimateScale: args.scale ?? undefined,
      updatedAt: Date.now(),
    })
    return await ctx.db.get(args.projectId)
  },
})

// ---------------------------------------------------------------------------
// Persona (live-inherit; null = clear override, resume inheriting)
// ---------------------------------------------------------------------------
export const updatePersona = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    systemPrompt: v.union(v.null(), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const persona =
      typeof args.systemPrompt === "string" && args.systemPrompt.trim()
        ? { systemPrompt: args.systemPrompt.trim() }
        : undefined

    if (persona === undefined && args.systemPrompt !== null && args.systemPrompt !== "") {
      // Empty string treated as "clear override" (inherit)
    }

    await ctx.db.patch(args.projectId, { persona, updatedAt: Date.now() })
    return await ctx.db.get(args.projectId)
  },
})
