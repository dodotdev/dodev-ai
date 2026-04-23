import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

/** Per-space project quota by plan. Infinity = no cap. */
const PROJECTS_PER_SPACE_BY_PLAN: Record<string, number> = {
  free: 3,
  pro: 10,
  team: 10,
  enterprise: Number.POSITIVE_INFINITY,
}

/** Normalize a repo URL: strip protocol, trailing .git, lowercase */
function normalizeRepoUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^git@([^:]+):/, "$1/")
    .replace(/\.git$/, "")
    .toLowerCase()
}

/** Derive a project slug from a name: uppercase, alnum only, max 8 chars */
function deriveProjectSlug(name: string): string {
  const clean = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  if (!clean) return "PROJ"
  return clean.slice(0, 8)
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    // Enforce per-space project quota.
    const limit = PROJECTS_PER_SPACE_BY_PLAN[user.plan] ?? 3
    if (Number.isFinite(limit)) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId))
        .collect()
      if (existing.length >= limit) {
        throw new ConvexError("QUOTA_EXCEEDED")
      }
    }

    // Resolve slug: user-provided wins; else derive from name. Auto-suffix
    // on collision within this space.
    const base =
      (args.slug?.trim().toUpperCase() || deriveProjectSlug(args.name)).replace(/[^A-Z0-9]/g, "") ||
      "PROJ"
    let candidate = base
    let suffix = 2
    while (true) {
      const clash = await ctx.db
        .query("projects")
        .withIndex("by_space_slug", (q) => q.eq("spaceId", args.spaceId).eq("slug", candidate))
        .first()
      if (!clash) break
      candidate = `${base}${suffix}`
      suffix++
    }

    const now = Date.now()
    const id = await ctx.db.insert("projects", {
      userId: user._id,
      spaceId: args.spaceId,
      name: args.name,
      slug: candidate,
      description: args.description,
      status: "active",
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    })

    return await ctx.db.get(id)
  },
})

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------
export const list = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    let projects: Doc<"projects">[]
    if (args.spaceId && args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user_space_status", (q) =>
          q.eq("userId", user._id).eq("spaceId", args.spaceId!).eq("status", args.status!)
        )
        .collect()
    } else if (args.spaceId) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId!))
        .collect()
    } else {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect()
      if (args.status) {
        projects = projects.filter((p) => p.status === args.status)
      }
    }

    return projects
  },
})

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------
export const get = query({
  args: {
    apiKeyHash: v.string(),
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) return null
    return project
  },
})

// ---------------------------------------------------------------------------
// getBySlug  (resolves {spaceId, slug} -> project; useful for MCP slug inputs)
// ---------------------------------------------------------------------------
export const getBySlug = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const slug = args.slug.trim().toUpperCase()
    const project = await ctx.db
      .query("projects")
      .withIndex("by_space_slug", (q) => q.eq("spaceId", args.spaceId).eq("slug", slug))
      .first()
    if (!project || project.userId !== user._id) return null
    return project
  },
})

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("projects"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.status !== undefined) updates.status = args.status
    if (args.metadata !== undefined) updates.metadata = args.metadata

    if (args.slug !== undefined) {
      const newSlug = args.slug
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
      if (!newSlug) throw new ConvexError("INVALID_SLUG")
      const clash = await ctx.db
        .query("projects")
        .withIndex("by_space_slug", (q) => q.eq("spaceId", project.spaceId).eq("slug", newSlug))
        .first()
      if (clash && clash._id !== args.id) {
        throw new ConvexError("SLUG_ALREADY_EXISTS")
      }
      updates.slug = newSlug
    }

    await ctx.db.patch(args.id, updates)
    return await ctx.db.get(args.id)
  },
})

// ---------------------------------------------------------------------------
// archive  (soft; does not cascade; children keep their projectId)
// ---------------------------------------------------------------------------
export const archive = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    await ctx.db.patch(args.id, { status: "archived", updatedAt: Date.now() })
    return await ctx.db.get(args.id)
  },
})

// ---------------------------------------------------------------------------
// remove (soft-delete: detaches children back to space-level, then deletes row)
// ---------------------------------------------------------------------------
export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    // Detach children — clear projectId but preserve spaceId so items drop
    // back to space-level rather than becoming orphans.
    const now = Date.now()

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const t of tasks) {
      await ctx.db.patch(t._id, { projectId: undefined, updatedAt: now })
    }

    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const i of issues) {
      await ctx.db.patch(i._id, { projectId: undefined, updatedAt: now })
    }

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const m of memories) {
      await ctx.db.patch(m._id, { projectId: undefined, updatedAt: now })
    }

    const cycles = await ctx.db
      .query("cycles")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const c of cycles) {
      await ctx.db.patch(c._id, { projectId: undefined, updatedAt: now })
    }

    const versions = await ctx.db
      .query("versions")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const vr of versions) {
      await ctx.db.patch(vr._id, { projectId: undefined, updatedAt: now })
    }

    // Clear session references
    const sessionsWithProject = await ctx.db.query("sessions").collect()
    for (const s of sessionsWithProject) {
      if (s.activeProjectId === args.id && s.userId === user._id) {
        await ctx.db.patch(s._id, { activeProjectId: undefined })
      }
    }

    // Clear user default if pointed here
    if (user.settings.defaultProjectId === args.id) {
      const { defaultProjectId: _removed, ...restSettings } = user.settings
      await ctx.db.patch(user._id, { settings: restSettings, updatedAt: Date.now() })
    }

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

// ---------------------------------------------------------------------------
// linkProject / unlinkProject — workspace path + repo linking
// ---------------------------------------------------------------------------
export const linkProject = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    path: v.optional(v.string()),
    repo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.path) {
      const paths = project.linkedPaths ?? []
      if (!paths.includes(args.path)) updates.linkedPaths = [...paths, args.path]
    }
    if (args.repo) {
      const normalized = normalizeRepoUrl(args.repo)
      const repos = project.linkedRepos ?? []
      if (!repos.includes(normalized)) updates.linkedRepos = [...repos, normalized]
    }
    await ctx.db.patch(args.projectId, updates)
    return await ctx.db.get(args.projectId)
  },
})

export const unlinkProject = mutation({
  args: {
    apiKeyHash: v.string(),
    projectId: v.id("projects"),
    path: v.optional(v.string()),
    repo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.path) {
      updates.linkedPaths = (project.linkedPaths ?? []).filter((p) => p !== args.path)
    }
    if (args.repo) {
      const normalized = normalizeRepoUrl(args.repo)
      updates.linkedRepos = (project.linkedRepos ?? []).filter((r) => r !== normalized)
    }
    await ctx.db.patch(args.projectId, updates)
    return await ctx.db.get(args.projectId)
  },
})

/**
 * Resolve a project by workspace path or repo URL. If spaceId is provided,
 * the search is narrowed to that space; otherwise scans all of the user's
 * projects. Returns null when no match.
 */
export const resolveProjectByWorkspace = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    workspacePath: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    if (!args.workspacePath && !args.repoUrl) return null

    const projects = args.spaceId
      ? await ctx.db
          .query("projects")
          .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId!))
          .collect()
      : await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()

    const normalizedRepo = args.repoUrl ? normalizeRepoUrl(args.repoUrl) : null

    for (const p of projects) {
      if (p.status === "archived") continue
      if (normalizedRepo && p.linkedRepos?.includes(normalizedRepo)) return p
      if (args.workspacePath && p.linkedPaths?.includes(args.workspacePath)) return p
    }
    return null
  },
})
