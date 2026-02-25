import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey, checkQuota } from "./lib/auth"
import { incrementUsage } from "./lib/utils"

/**
 * Generate an upload URL for file storage.
 * The client uploads the file directly to this URL, then calls `save` with the storageId.
 */
export const generateUploadUrl = mutation({
  args: {
    apiKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticateApiKey(ctx, args.apiKeyHash)
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Save an attachment record after the file has been uploaded to storage.
 * Validates that exactly one of todoId or issueId is provided.
 */
export const save = mutation({
  args: {
    apiKeyHash: v.string(),
    storageId: v.id("_storage"),
    todoId: v.optional(v.id("todos")),
    issueId: v.optional(v.id("issues")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    // Validate exactly one parent is provided
    if (!args.todoId && !args.issueId) {
      throw new ConvexError("VALIDATION_ERROR: either todoId or issueId is required")
    }
    if (args.todoId && args.issueId) {
      throw new ConvexError("VALIDATION_ERROR: provide only one of todoId or issueId, not both")
    }

    // Validate parent exists and belongs to user, extract projectId
    // biome-ignore lint/suspicious/noExplicitAny: projectId comes from parent todo/issue lookup
    let projectId: any
    if (args.todoId) {
      const todo = await ctx.db.get(args.todoId)
      if (!todo || todo.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      projectId = todo.projectId
    } else if (args.issueId) {
      const issue = await ctx.db.get(args.issueId)
      if (!issue || issue.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      projectId = issue.projectId
    }

    await checkQuota(ctx, user, "attachments")

    const now = Date.now()
    const id = await ctx.db.insert("attachments", {
      userId: user._id,
      todoId: args.todoId,
      issueId: args.issueId,
      projectId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      description: args.description,
      createdAt: now,
    })

    await incrementUsage(ctx, user._id, "attachmentCount")

    const attachment = await ctx.db.get(id)
    const url = await ctx.storage.getUrl(args.storageId)
    return { ...attachment, url }
  },
})

/**
 * List attachments for a given todo or issue.
 * Enriches each attachment with its download URL.
 */
export const list = query({
  args: {
    apiKeyHash: v.string(),
    todoId: v.optional(v.id("todos")),
    issueId: v.optional(v.id("issues")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    let attachments
    if (args.todoId) {
      attachments = await ctx.db
        .query("attachments")
        .withIndex("by_todo", (q) => q.eq("todoId", args.todoId!))
        .collect()
    } else if (args.issueId) {
      attachments = await ctx.db
        .query("attachments")
        .withIndex("by_issue", (q) => q.eq("issueId", args.issueId!))
        .collect()
    } else {
      throw new ConvexError("VALIDATION_ERROR: either todoId or issueId is required")
    }

    // Filter to only this user's attachments
    const userAttachments = attachments.filter((a) => a.userId === user._id)

    // Enrich with download URLs
    const results = []
    for (const att of userAttachments) {
      const url = await ctx.storage.getUrl(att.storageId)
      results.push({ ...att, url })
    }
    return results
  },
})

/**
 * Delete an attachment and its underlying file from storage.
 */
export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const attachment = await ctx.db.get(args.id)
    if (!attachment || attachment.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    await ctx.storage.delete(attachment.storageId)
    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

// Note: uploadFromBase64 action is in attachmentsInternal.ts to avoid
// circular type inference with the Convex `internal` API type.
