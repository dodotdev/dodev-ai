import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

/**
 * Create a comment on a task or issue.
 * Supports threaded replies via parentId — when provided, taskId/issueId/projectId
 * are inherited from the parent comment.
 */
export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
    parentId: v.optional(v.id("comments")),
    body: v.string(),
    authorName: v.optional(v.string()),
    authorType: v.optional(v.union(v.literal("user"), v.literal("agent"))),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    let taskId = args.taskId
    let issueId = args.issueId
    // biome-ignore lint/suspicious/noExplicitAny: projectId comes from parent task/issue/comment lookup
    let projectId: any

    // If parentId is provided, inherit taskId/issueId/projectId from parent
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId)
      if (!parent || parent.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      taskId = parent.taskId
      issueId = parent.issueId
      projectId = parent.projectId
    }

    // Validate exactly one of taskId/issueId is present
    if (!taskId && !issueId) {
      throw new ConvexError("VALIDATION_ERROR: either taskId or issueId is required")
    }
    if (taskId && issueId) {
      throw new ConvexError("VALIDATION_ERROR: provide only one of taskId or issueId, not both")
    }

    // Validate parent task/issue exists and belongs to user, derive projectId
    if (taskId) {
      const task = await ctx.db.get(taskId)
      if (!task || task.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      if (!args.parentId) {
        projectId = task.projectId
      }
    } else if (issueId) {
      const issue = await ctx.db.get(issueId)
      if (!issue || issue.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      if (!args.parentId) {
        projectId = issue.projectId
      }
    }

    const now = Date.now()
    const id = await ctx.db.insert("comments", {
      userId: user._id,
      taskId,
      issueId,
      projectId,
      parentId: args.parentId,
      body: args.body,
      authorName: args.authorName,
      authorType: args.authorType,
      createdAt: now,
      updatedAt: now,
    })

    return await ctx.db.get(id)
  },
})

/**
 * List all comments for a task or issue, sorted by createdAt ascending.
 * Exactly one of taskId or issueId must be provided.
 */
export const list = query({
  args: {
    apiKeyHash: v.string(),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    let comments
    if (args.taskId) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId!))
        .collect()
    } else if (args.issueId) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_issue", (q) => q.eq("issueId", args.issueId!))
        .collect()
    } else {
      throw new ConvexError("VALIDATION_ERROR: either taskId or issueId is required")
    }

    // Filter to only this user's comments and sort ascending by createdAt
    return comments.filter((c) => c.userId === user._id).sort((a, b) => a.createdAt - b.createdAt)
  },
})

/**
 * Update a comment's body.
 * Validates ownership before updating.
 */
export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("comments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const comment = await ctx.db.get(args.id)
    if (!comment || comment.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    await ctx.db.patch(args.id, { body: args.body, updatedAt: Date.now() })
    return await ctx.db.get(args.id)
  },
})

/**
 * Delete a comment by ID.
 * Validates ownership before deletion.
 */
export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const comment = await ctx.db.get(args.id)
    if (!comment || comment.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})
