import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type QueryCtx, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

/** Resolve to a single non-overlapping scope. projectId wins when both set. */
async function resolveScope(
  _ctx: QueryCtx,
  args: { spaceId?: Id<"spaces">; projectId?: Id<"projects"> }
): Promise<{ spaceId?: Id<"spaces">; projectId?: Id<"projects"> }> {
  if (args.projectId) return { projectId: args.projectId }
  if (args.spaceId) return { spaceId: args.spaceId }
  throw new ConvexError("Handover requires spaceId or projectId.")
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "handover"
  )
}

/**
 * Append-only by design. There is no `update` here — corrections happen via a
 * new handover that may reference the prior one in its body.
 */
export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    tldr: v.string(),
    markdown: v.string(),
    author: v.optional(v.string()),
    decisions: v.optional(v.array(v.string())),
    blockers: v.optional(v.array(v.string())),
    nextSteps: v.optional(v.array(v.string())),
    referencedTaskIds: v.optional(v.array(v.id("tasks"))),
    referencedIssueIds: v.optional(v.array(v.id("issues"))),
    gitHead: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)

    if (!args.title.trim() || !args.tldr.trim() || !args.markdown.trim()) {
      throw new ConvexError("title, tldr, and markdown are required.")
    }

    const now = Date.now()
    const dateSlug = new Date(now).toISOString().slice(0, 10)
    const slug = `${dateSlug}-${slugify(args.title)}`

    const id = await ctx.db.insert("handovers", {
      userId: user._id,
      spaceId: scope.spaceId,
      projectId: scope.projectId,
      title: args.title,
      slug,
      author: args.author,
      tldr: args.tldr,
      markdown: args.markdown,
      decisions: args.decisions,
      blockers: args.blockers,
      nextSteps: args.nextSteps,
      referencedTaskIds: args.referencedTaskIds,
      referencedIssueIds: args.referencedIssueIds,
      gitHead: args.gitHead,
      createdAt: now,
    })

    return await ctx.db.get(id)
  },
})

export const list = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)
    const limit = Math.min(args.limit ?? 20, 100)

    const rows = scope.projectId
      ? await ctx.db
          .query("handovers")
          .withIndex("by_user_project_created", (q) =>
            q.eq("userId", user._id).eq("projectId", scope.projectId)
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("handovers")
          .withIndex("by_user_space_created", (q) =>
            q.eq("userId", user._id).eq("spaceId", scope.spaceId)
          )
          .order("desc")
          .take(limit)

    return rows
  },
})

/** N most recent handovers, newest first. Used by get_context + the /dodev skill. */
export const latest = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"handovers">[]> => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const scope = await resolveScope(ctx, args)
    const count = Math.min(args.count ?? 3, 10)

    const rows = scope.projectId
      ? await ctx.db
          .query("handovers")
          .withIndex("by_user_project_created", (q) =>
            q.eq("userId", user._id).eq("projectId", scope.projectId)
          )
          .order("desc")
          .take(count)
      : await ctx.db
          .query("handovers")
          .withIndex("by_user_space_created", (q) =>
            q.eq("userId", user._id).eq("spaceId", scope.spaceId)
          )
          .order("desc")
          .take(count)

    return rows
  },
})

export const get = query({
  args: { apiKeyHash: v.string(), id: v.id("handovers") },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const row = await ctx.db.get(args.id)
    if (!row || row.userId !== user._id) throw new ConvexError("NOT_FOUND")
    return row
  },
})
