import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey, checkQuota } from "./lib/auth"
import { incrementUsage } from "./lib/utils"

export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal("bug"), v.literal("feature"), v.literal("improvement"), v.literal("task"))
    ),
    severity: v.optional(
      v.union(v.literal("critical"), v.literal("major"), v.literal("minor"), v.literal("trivial"))
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))
    ),
    projectId: v.optional(v.id("projects")),
    spaceId: v.optional(v.id("spaces")),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    statusId: v.optional(v.string()),
    labelIds: v.optional(v.array(v.string())),
    assigneeId: v.optional(v.string()),
    estimate: v.optional(v.string()),
    cycleId: v.optional(v.id("cycles")),
    changelog: v.optional(v.boolean()),
    versionId: v.optional(v.id("versions")),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await checkQuota(ctx, user, "issues")

    // Resolve the space. When projectId is set, derive spaceId from the
    // project so callers don't have to duplicate it. Projects are filter
    // scopes only — all workflow config lives on the space.
    let space = null
    let resolvedSpaceId = args.spaceId
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (!project || project.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      resolvedSpaceId = project.spaceId
      space = await ctx.db.get(project.spaceId)
    } else if (args.spaceId) {
      space = await ctx.db.get(args.spaceId)
    }

    // Derive base status category from the space's statusId mapping.
    let status: "pending" | "in_progress" | "completed" | "cancelled" = "pending"
    if (args.statusId && space) {
      const ws = space.statuses.find((s) => s.id === args.statusId)
      if (ws) status = ws.category
    }

    // Auto-increment counter: space > user. Issues in a project still use
    // the space counter — projectId is just a filter tag.
    let nextNumber: number
    if (space) {
      nextNumber = (space.itemCounter ?? 0) + 1
      await ctx.db.patch(space._id, { itemCounter: nextNumber })
    } else {
      nextNumber = (user.itemCounter ?? 0) + 1
      await ctx.db.patch(user._id, { itemCounter: nextNumber })
    }

    const now = Date.now()
    const id = await ctx.db.insert("issues", {
      userId: user._id,
      projectId: args.projectId,
      spaceId: resolvedSpaceId,
      number: nextNumber,
      title: args.title,
      description: args.description,
      status,
      priority: args.priority ?? "medium",
      type: args.type ?? "task",
      severity: args.severity ?? "minor",
      dueDate: args.dueDate,
      tags: args.tags ?? [],
      statusId: args.statusId,
      labelIds: args.labelIds,
      assigneeId: args.assigneeId,
      estimate: args.estimate,
      cycleId: args.cycleId,
      changelog: args.changelog,
      versionId: args.versionId,
      createdAt: now,
      updatedAt: now,
    })

    await incrementUsage(ctx, user._id, "issueCount")
    return await ctx.db.get(id)
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("issues"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))
    ),
    type: v.optional(
      v.union(v.literal("bug"), v.literal("feature"), v.literal("improvement"), v.literal("task"))
    ),
    severity: v.optional(
      v.union(v.literal("critical"), v.literal("major"), v.literal("minor"), v.literal("trivial"))
    ),
    dueDate: v.optional(v.union(v.number(), v.null())),
    tags: v.optional(v.array(v.string())),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
    spaceId: v.optional(v.union(v.id("spaces"), v.null())),
    statusId: v.optional(v.union(v.string(), v.null())),
    labelIds: v.optional(v.union(v.array(v.string()), v.null())),
    assigneeId: v.optional(v.union(v.string(), v.null())),
    estimate: v.optional(v.union(v.string(), v.null())),
    cycleId: v.optional(v.union(v.id("cycles"), v.null())),
    changelog: v.optional(v.union(v.boolean(), v.null())),
    versionId: v.optional(v.union(v.id("versions"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const issue = await ctx.db.get(args.id)
    if (!issue || issue.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description

    // When statusId changes, derive the base status category
    // Prefer spaceId over projectId for status lookup
    if (args.statusId !== undefined) {
      if (args.statusId === null) {
        updates.statusId = undefined
      } else {
        updates.statusId = args.statusId
        // Resolve space first, then project
        const spaceId = args.spaceId !== undefined ? (args.spaceId ?? undefined) : issue.spaceId
        const projectId =
          args.projectId !== undefined ? (args.projectId ?? undefined) : issue.projectId
        let derived = false
        if (spaceId) {
          const space = await ctx.db.get(spaceId)
          if (space) {
            const ws = space.statuses.find((s) => s.id === args.statusId)
            if (ws) {
              updates.status = ws.category
              if (ws.category === "completed") updates.completedAt = Date.now()
              derived = true
            }
          }
        }
        // Fallback: when updating an issue that has only a projectId,
        // resolve the space via the project and look up there. Projects
        // don't carry their own statuses.
        if (!derived && projectId) {
          const project = await ctx.db.get(projectId)
          if (project) {
            const parentSpace = await ctx.db.get(project.spaceId)
            const ws = parentSpace?.statuses.find((s) => s.id === args.statusId)
            if (ws) {
              updates.status = ws.category
              if (ws.category === "completed") updates.completedAt = Date.now()
            }
          }
        }
      }
    }

    // Direct status override
    if (args.status !== undefined && args.statusId === undefined) {
      updates.status = args.status
      if (args.status === "completed") updates.completedAt = Date.now()
    }

    if (args.priority !== undefined) updates.priority = args.priority
    if (args.type !== undefined) updates.type = args.type
    if (args.severity !== undefined) updates.severity = args.severity
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate ?? undefined
    if (args.tags !== undefined) updates.tags = args.tags
    if (args.projectId !== undefined) updates.projectId = args.projectId ?? undefined
    if (args.spaceId !== undefined) updates.spaceId = args.spaceId ?? undefined
    if (args.labelIds !== undefined) updates.labelIds = args.labelIds ?? undefined
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId ?? undefined
    if (args.estimate !== undefined) updates.estimate = args.estimate ?? undefined
    if (args.cycleId !== undefined) updates.cycleId = args.cycleId ?? undefined
    if (args.changelog !== undefined) updates.changelog = args.changelog ?? undefined
    if (args.versionId !== undefined) updates.versionId = args.versionId ?? undefined

    await ctx.db.patch(args.id, updates)
    return await ctx.db.get(args.id)
  },
})

export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("issues"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const issue = await ctx.db.get(args.id)
    if (!issue || issue.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    // Cascade delete associated attachments
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_issue", (q) => q.eq("issueId", args.id))
      .collect()
    for (const att of attachments) {
      await ctx.storage.delete(att.storageId)
      await ctx.db.delete(att._id)
    }

    // Cascade delete associated comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_issue", (q) => q.eq("issueId", args.id))
      .collect()
    for (const comment of comments) {
      await ctx.db.delete(comment._id)
    }

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

export const list = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    spaceId: v.optional(v.id("spaces")),
    globalOnly: v.optional(v.boolean()),
    status: v.optional(v.string()),
    statusId: v.optional(v.string()),
    priority: v.optional(v.string()),
    type: v.optional(v.string()),
    severity: v.optional(v.string()),
    search: v.optional(v.string()),
    summary: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 20, 100)

    if (args.search) {
      const results = await ctx.db
        .query("issues")
        .withSearchIndex("search_title_description", (q) => {
          let search = q.search("title", args.search!)
          search = search.eq("userId", user._id)
          if (args.spaceId) search = search.eq("spaceId", args.spaceId)
          else if (args.projectId) search = search.eq("projectId", args.projectId)
          return search
        })
        .take(limit)

      let filtered = results
        .filter((i) => !args.type || i.type === args.type)
        .filter((i) => !args.severity || i.severity === args.severity)
      if (args.globalOnly) {
        filtered = filtered.filter((i) => !i.projectId && !i.spaceId)
      }

      if (args.summary) {
        return filtered.map((i) => ({
          _id: i._id,
          number: i.number,
          title: i.title,
          status: i.status,
          statusId: i.statusId,
          priority: i.priority,
          type: i.type,
          severity: i.severity,
          assigneeId: i.assigneeId,
        }))
      }
      return filtered
    }

    // Index-based query — narrower scope wins (projectId > spaceId > user).
    let issueQuery
    if (args.projectId && args.statusId) {
      issueQuery = ctx.db
        .query("issues")
        .withIndex("by_user_project_statusId", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!).eq("statusId", args.statusId!)
        )
    } else if (args.projectId && args.status) {
      issueQuery = ctx.db.query("issues").withIndex("by_user_project_status", (q) =>
        q
          .eq("userId", user._id)
          .eq("projectId", args.projectId!)
          .eq("status", args.status as "pending" | "in_progress" | "completed" | "cancelled")
      )
    } else if (args.projectId) {
      issueQuery = ctx.db
        .query("issues")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!)
        )
    } else if (args.spaceId && args.statusId) {
      issueQuery = ctx.db
        .query("issues")
        .withIndex("by_user_space_statusId", (q) =>
          q.eq("userId", user._id).eq("spaceId", args.spaceId!).eq("statusId", args.statusId!)
        )
    } else if (args.spaceId && args.status) {
      issueQuery = ctx.db.query("issues").withIndex("by_user_space_status", (q) =>
        q
          .eq("userId", user._id)
          .eq("spaceId", args.spaceId!)
          .eq("status", args.status as "pending" | "in_progress" | "completed" | "cancelled")
      )
    } else if (args.spaceId) {
      issueQuery = ctx.db
        .query("issues")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId!))
    } else if (args.globalOnly) {
      // Use by_user index and post-filter to exclude both projectId and spaceId,
      // since no composite index covers both projectId=undefined AND spaceId=undefined.
      issueQuery = ctx.db.query("issues").withIndex("by_user", (q) => q.eq("userId", user._id))
    } else if (args.status) {
      issueQuery = ctx.db
        .query("issues")
        .withIndex("by_user_status", (q) =>
          q
            .eq("userId", user._id)
            .eq("status", args.status as "pending" | "in_progress" | "completed" | "cancelled")
        )
    } else {
      issueQuery = ctx.db.query("issues").withIndex("by_user", (q) => q.eq("userId", user._id))
    }

    // When globalOnly, fetch more to account for post-filtering loss
    const fetchLimit = args.globalOnly ? limit * 3 : limit
    let results = await issueQuery.order("desc").take(fetchLimit)

    // Post-filter for globalOnly: exclude both project-scoped and space-scoped issues
    if (args.globalOnly) {
      results = results.filter((i) => !i.projectId && !i.spaceId)
      results = results.slice(0, limit)
      // Also apply status filter if specified (since we used by_user index, not by_user_status)
      if (args.status) {
        results = results.filter((i) => i.status === args.status)
      }
    }

    const filtered = results
      .filter((i) => !args.type || i.type === args.type)
      .filter((i) => !args.severity || i.severity === args.severity)

    if (args.summary) {
      return filtered.map((i) => ({
        _id: i._id,
        number: i.number,
        title: i.title,
        status: i.status,
        statusId: i.statusId,
        priority: i.priority,
        type: i.type,
        severity: i.severity,
        assigneeId: i.assigneeId,
      }))
    }

    return filtered
  },
})

export const get = query({
  args: {
    apiKeyHash: v.string(),
    id: v.id("issues"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const issue = await ctx.db.get(args.id)
    if (!issue || issue.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    return issue
  },
})
