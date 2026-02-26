import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("released"))),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const now = Date.now()
    const status = args.status ?? "draft"
    const id = await ctx.db.insert("versions", {
      userId: user._id,
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      status,
      releasedAt: status === "released" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    })

    return await ctx.db.get(id)
  },
})

export const list = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    if (args.status) {
      return await ctx.db
        .query("versions")
        .withIndex("by_user_project_status", (q) =>
          q
            .eq("userId", user._id)
            .eq("projectId", args.projectId)
            .eq("status", args.status as "draft" | "released")
        )
        .collect()
    }

    return await ctx.db
      .query("versions")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .collect()
  },
})

export const get = query({
  args: {
    apiKeyHash: v.string(),
    id: v.id("versions"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const version = await ctx.db.get(args.id)
    if (!version || version.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    return version
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("versions"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.union(v.literal("draft"), v.literal("released"))),
    releasedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const version = await ctx.db.get(args.id)
    if (!version || version.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description ?? undefined
    if (args.status !== undefined) {
      updates.status = args.status
      if (args.status === "released" && version.status !== "released") {
        updates.releasedAt = Date.now()
      }
    }
    if (args.releasedAt !== undefined) updates.releasedAt = args.releasedAt ?? undefined

    await ctx.db.patch(args.id, updates)
    return await ctx.db.get(args.id)
  },
})

export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("versions"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const version = await ctx.db.get(args.id)
    if (!version || version.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project_version", (q) =>
        q.eq("userId", user._id).eq("projectId", version.projectId).eq("versionId", args.id)
      )
      .collect()

    for (const task of tasks) {
      await ctx.db.patch(task._id, { versionId: undefined, updatedAt: Date.now() })
    }

    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project_version", (q) =>
        q.eq("userId", user._id).eq("projectId", version.projectId).eq("versionId", args.id)
      )
      .collect()

    for (const issue of issues) {
      await ctx.db.patch(issue._id, { versionId: undefined, updatedAt: Date.now() })
    }

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

export const getChangelog = query({
  args: {
    apiKeyHash: v.string(),
    versionId: v.id("versions"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const version = await ctx.db.get(args.versionId)
    if (!version || version.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project_version", (q) =>
        q.eq("userId", user._id).eq("projectId", version.projectId).eq("versionId", args.versionId)
      )
      .collect()

    const changelogTasks = tasks.filter((t) => t.changelog === true)

    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project_version", (q) =>
        q.eq("userId", user._id).eq("projectId", version.projectId).eq("versionId", args.versionId)
      )
      .collect()

    const changelogIssues = issues.filter((i) => i.changelog === true)

    return {
      version,
      tasks: changelogTasks,
      issues: changelogIssues,
    }
  },
})
