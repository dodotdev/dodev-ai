import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import { action, internalMutation, internalQuery } from "./_generated/server"
import { incrementUsage } from "./lib/utils"

// Convex actions provide these globals at runtime but tsconfig doesn't declare them
declare function fetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body: Blob }
): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>
declare function atob(data: string): string
declare const Blob: {
  new (parts: Array<Uint8Array>, options: { type: string }): Blob
}
declare type Blob = { readonly size: number; readonly type: string }

/** Internal: generate upload URL (no auth check, called from action) */
export const internalGenerateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

/** Internal: save attachment record (no auth check, called from action) */
export const internalSave = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
    projectId: v.optional(v.id("projects")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const id = await ctx.db.insert("attachments", {
      userId: args.userId,
      taskId: args.taskId,
      issueId: args.issueId,
      projectId: args.projectId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      description: args.description,
      createdAt: now,
    })

    await incrementUsage(ctx, args.userId, "attachmentCount")

    const attachment = await ctx.db.get(id)
    const url = await ctx.storage.getUrl(args.storageId)
    return { ...attachment, url }
  },
})

/** Internal: get attachment URL (called from action) */
export const internalGetUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

/** Internal: validate parent task exists and belongs to user */
export const internalGetTaskParent = internalQuery({
  args: {
    id: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task || task.userId !== args.userId) return null
    return { projectId: task.projectId as string | undefined }
  },
})

/** Internal: validate parent issue exists and belongs to user */
export const internalGetIssueParent = internalQuery({
  args: {
    id: v.id("issues"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.id)
    if (!issue || issue.userId !== args.userId) return null
    return { projectId: issue.projectId as string | undefined }
  },
})

/**
 * Upload a file from base64 content (action).
 * Used by the MCP server to upload files without a two-step process.
 * Actions cannot directly access ctx.db or ctx.storage — delegates to internal mutations.
 *
 * This action lives in attachmentsInternal.ts (rather than attachments.ts) to avoid
 * circular type inference through the Convex `internal` API type.
 */
export const uploadFromBase64 = action({
  args: {
    apiKeyHash: v.string(),
    taskId: v.optional(v.string()),
    issueId: v.optional(v.string()),
    filename: v.string(),
    base64Content: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate
    const user = (await ctx.runQuery(internal.memories.authenticateForSearch, {
      apiKeyHash: args.apiKeyHash,
    })) as { _id: any; plan: string } | null
    if (!user) throw new ConvexError("UNAUTHORIZED")

    // 2. Validate exactly one parent is provided
    if (!args.taskId && !args.issueId) {
      throw new ConvexError("VALIDATION_ERROR: either taskId or issueId is required")
    }
    if (args.taskId && args.issueId) {
      throw new ConvexError("VALIDATION_ERROR: provide only one of taskId or issueId, not both")
    }

    // 3. Validate parent exists and get projectId
    let projectId: string | undefined
    if (args.taskId) {
      const task = (await ctx.runQuery(internal.attachmentsInternal.internalGetTaskParent, {
        id: args.taskId as any,
        userId: user._id,
      })) as { projectId: string | undefined } | null
      if (!task) throw new ConvexError("NOT_FOUND")
      projectId = task.projectId
    } else if (args.issueId) {
      const issue = (await ctx.runQuery(internal.attachmentsInternal.internalGetIssueParent, {
        id: args.issueId as any,
        userId: user._id,
      })) as { projectId: string | undefined } | null
      if (!issue) throw new ConvexError("NOT_FOUND")
      projectId = issue.projectId
    }

    // 4. Generate upload URL
    const uploadUrl: string = await ctx.runMutation(
      internal.attachmentsInternal.internalGenerateUploadUrl,
      {}
    )

    // 5. Decode base64 to binary and upload
    const binaryString = atob(args.base64Content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: args.mimeType })

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": args.mimeType },
      body: blob,
    })

    if (!uploadResponse.ok) {
      throw new ConvexError("UPLOAD_FAILED: could not upload file to storage")
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: string }

    // 6. Save the attachment record
    const result = (await ctx.runMutation(internal.attachmentsInternal.internalSave, {
      userId: user._id,
      storageId: storageId as any,
      taskId: args.taskId as any,
      issueId: args.issueId as any,
      projectId: projectId as any,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      description: args.description,
    })) as Record<string, unknown>

    return result
  },
})
