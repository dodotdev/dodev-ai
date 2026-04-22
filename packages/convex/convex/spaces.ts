import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey, checkQuota } from "./lib/auth"
import { generateConfigId, incrementUsage } from "./lib/utils"

const DEFAULT_STATUSES = [
  { name: "Backlog", category: "pending" as const, color: "#6b7280", position: 0 },
  { name: "Task", category: "pending" as const, color: "#f59e0b", position: 1 },
  { name: "In Progress", category: "in_progress" as const, color: "#3b82f6", position: 2 },
  { name: "In Review", category: "in_progress" as const, color: "#8b5cf6", position: 3 },
  { name: "Done", category: "completed" as const, color: "#10b981", position: 4 },
  { name: "Cancelled", category: "cancelled" as const, color: "#ef4444", position: 5 },
]

const DEFAULT_ESTIMATE_SCALE = {
  type: "points" as const,
  values: ["1", "2", "3", "5", "8", "13", "21"],
}

/** Derive a slug from a space name: take uppercase initials, or first word uppercase, max 5 chars */
function deriveSlug(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    // Use initials: "My Space" -> "MS"
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 5)
  }
  // Single word: take first 3 chars uppercase
  return words[0].toUpperCase().slice(0, 5)
}

/** Normalize a repo URL: strip protocol, trailing .git, lowercase */
function normalizeRepoUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^git@([^:]+):/, "$1/")
    .replace(/\.git$/, "")
    .toLowerCase()
}

export const create = mutation({
  args: {
    apiKeyHash: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await checkQuota(ctx, user, "spaces")

    // Determine slug: use provided or derive from name
    let slug = (args.slug?.trim().toUpperCase() || deriveSlug(args.name)).replace(/[^A-Z0-9]/g, "")
    if (!slug) slug = "SPC"

    // Ensure global uniqueness -- append a digit if taken
    let candidate = slug
    let suffix = 1
    while (true) {
      const existing = await ctx.db
        .query("spaces")
        .withIndex("by_slug", (q) => q.eq("slug", candidate))
        .first()
      if (!existing) break
      candidate = `${slug}${suffix}`
      suffix++
    }
    slug = candidate

    const now = Date.now()
    const id = await ctx.db.insert("spaces", {
      userId: user._id,
      name: args.name,
      slug,
      description: args.description,
      status: "active",
      itemCounter: 0,
      metadata: args.metadata,
      statuses: DEFAULT_STATUSES.map((s) => ({
        ...s,
        id: generateConfigId("st"),
      })),
      labels: [],
      members: [
        {
          id: generateConfigId("mb"),
          name: user.name || user.email,
          role: "owner",
          ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
        },
      ],
      estimateScale: DEFAULT_ESTIMATE_SCALE,
      createdAt: now,
      updatedAt: now,
    })

    await incrementUsage(ctx, user._id, "spaceCount")
    return await ctx.db.get(id)
  },
})

export const list = query({
  args: {
    apiKeyHash: v.string(),
    status: v.optional(v.string()),
    includeStats: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    let spaces
    if (args.status) {
      spaces = await ctx.db
        .query("spaces")
        .withIndex("by_user_status", (q) =>
          q
            .eq("userId", user._id)
            .eq("status", args.status as "active" | "paused" | "completed" | "archived")
        )
        .collect()
    } else {
      spaces = await ctx.db
        .query("spaces")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.neq(q.field("status"), "archived"))
        .collect()
    }

    if (args.includeStats) {
      return await Promise.all(
        spaces.map(async (space) => {
          const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", space._id))
            .collect()

          const memories = await ctx.db
            .query("memories")
            .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", space._id))
            .collect()

          return {
            ...space,
            stats: {
              totalTasks: tasks.length,
              pendingTasks: tasks.filter((t) => t.status === "pending").length,
              inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
              completedTasks: tasks.filter((t) => t.status === "completed").length,
              memoryCount: memories.length,
            },
          }
        })
      )
    }

    return spaces
  },
})

export const get = query({
  args: {
    apiKeyHash: v.string(),
    id: v.id("spaces"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.id)
    if (!space || space.userId !== user._id) {
      return null
    }
    return space
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("spaces"),
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
    const space = await ctx.db.get(args.id)
    if (!space || space.userId !== user._id) {
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
      // Ensure global uniqueness
      const existing = await ctx.db
        .query("spaces")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .first()
      if (existing && existing._id !== args.id) {
        throw new ConvexError("SLUG_ALREADY_EXISTS")
      }
      updates.slug = newSlug
    }

    await ctx.db.patch(args.id, updates)
    return await ctx.db.get(args.id)
  },
})

export const archive = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("spaces"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.id)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    await ctx.db.patch(args.id, {
      status: "archived",
      updatedAt: Date.now(),
    })
    return await ctx.db.get(args.id)
  },
})

export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("spaces"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.id)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    // Delete all space data using spaceId-based indexes
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.id))
      .collect()
    for (const task of tasks) await ctx.db.delete(task._id)

    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.id))
      .collect()
    for (const issue of issues) await ctx.db.delete(issue._id)

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.id))
      .collect()
    for (const memory of memories) await ctx.db.delete(memory._id)

    const cycles = await ctx.db
      .query("cycles")
      .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.id))
      .collect()
    for (const cycle of cycles) await ctx.db.delete(cycle._id)

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

// --- Space linking for workspace auto-detection ---

export const linkSpace = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    path: v.optional(v.string()),
    repo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }

    if (args.path) {
      const paths = space.linkedPaths ?? []
      if (!paths.includes(args.path)) {
        updates.linkedPaths = [...paths, args.path]
      }
    }

    if (args.repo) {
      const normalized = normalizeRepoUrl(args.repo)
      const repos = space.linkedRepos ?? []
      if (!repos.includes(normalized)) {
        updates.linkedRepos = [...repos, normalized]
      }
    }

    await ctx.db.patch(args.spaceId, updates)
    return await ctx.db.get(args.spaceId)
  },
})

export const unlinkSpace = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
    path: v.optional(v.string()),
    repo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const space = await ctx.db.get(args.spaceId)
    if (!space || space.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }

    if (args.path) {
      updates.linkedPaths = (space.linkedPaths ?? []).filter((p) => p !== args.path)
    }

    if (args.repo) {
      const normalized = normalizeRepoUrl(args.repo)
      updates.linkedRepos = (space.linkedRepos ?? []).filter((r) => r !== normalized)
    }

    await ctx.db.patch(args.spaceId, updates)
    return await ctx.db.get(args.spaceId)
  },
})

export const resolveSpaceByWorkspace = query({
  args: {
    apiKeyHash: v.string(),
    repoUrl: v.optional(v.string()),
    workspacePath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    if (!args.repoUrl && !args.workspacePath) return null

    const spaces = await ctx.db
      .query("spaces")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.neq(q.field("status"), "archived"))
      .collect()

    const normalizedRepo = args.repoUrl ? normalizeRepoUrl(args.repoUrl) : null

    for (const space of spaces) {
      // Check repo match first (more specific)
      if (normalizedRepo && space.linkedRepos?.includes(normalizedRepo)) {
        return space
      }
      // Check path match
      if (args.workspacePath && space.linkedPaths?.includes(args.workspacePath)) {
        return space
      }
    }

    return null
  },
})

export const getContext = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    agentId: v.optional(v.string()),
    taskLimit: v.optional(v.number()),
    memoryLimit: v.optional(v.number()),
    workspacePath: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const taskLimit = args.taskLimit ?? 10
    const memoryLimit = args.memoryLimit ?? 5

    // Resolve project + space. Resolution precedence:
    //   explicit projectId -> explicit spaceId -> workspace path/repo (project
    //   first, then space) -> session activeProjectId/activeSpaceId ->
    //   user.settings.defaultProjectId -> user.settings.defaultSpaceId.
    let activeSpace: Doc<"spaces"> | null = null
    let activeProject: Doc<"projects"> | null = null
    let workspaceInfo:
      | {
          detectedPath?: string
          detectedRepo?: string
          resolvedSpaceId?: string
          resolvedProjectId?: string
        }
      | undefined

    if (args.projectId) {
      activeProject = await ctx.db.get(args.projectId)
      if (activeProject && activeProject.userId === user._id) {
        activeSpace = await ctx.db.get(activeProject.spaceId)
      } else {
        activeProject = null
      }
    } else if (args.spaceId) {
      activeSpace = await ctx.db.get(args.spaceId)
    } else if (args.repoUrl || args.workspacePath) {
      const normalizedRepo = args.repoUrl ? normalizeRepoUrl(args.repoUrl) : null

      // Try project-level link first (more specific).
      const allProjects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.neq(q.field("status"), "archived"))
        .collect()
      for (const p of allProjects) {
        if (normalizedRepo && p.linkedRepos?.includes(normalizedRepo)) {
          activeProject = p
          break
        }
        if (args.workspacePath && p.linkedPaths?.includes(args.workspacePath)) {
          activeProject = p
          break
        }
      }
      if (activeProject) {
        activeSpace = await ctx.db.get(activeProject.spaceId)
      }

      if (!activeSpace) {
        const allSpaces = await ctx.db
          .query("spaces")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .filter((q) => q.neq(q.field("status"), "archived"))
          .collect()
        for (const space of allSpaces) {
          if (normalizedRepo && space.linkedRepos?.includes(normalizedRepo)) {
            activeSpace = space
            break
          }
          if (args.workspacePath && space.linkedPaths?.includes(args.workspacePath)) {
            activeSpace = space
            break
          }
        }
      }

      workspaceInfo = {
        detectedPath: args.workspacePath,
        detectedRepo: args.repoUrl,
        resolvedSpaceId: activeSpace?._id,
        resolvedProjectId: activeProject?._id,
      }
    }

    // Session fallback (if an agentId is supplied)
    if (!activeSpace && !activeProject && args.agentId) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_user_agent", (q) => q.eq("userId", user._id).eq("agentId", args.agentId!))
        .unique()
      if (session?.activeProjectId) {
        activeProject = await ctx.db.get(session.activeProjectId)
        if (activeProject) activeSpace = await ctx.db.get(activeProject.spaceId)
      } else if (session?.activeSpaceId) {
        activeSpace = await ctx.db.get(session.activeSpaceId)
      }
    }

    // User default fallback
    if (!activeSpace && !activeProject && user.settings.defaultProjectId) {
      const p = await ctx.db.get(user.settings.defaultProjectId)
      if (p && p.userId === user._id) {
        activeProject = p
        activeSpace = await ctx.db.get(p.spaceId)
      }
    }
    if (!activeSpace && user.settings.defaultSpaceId) {
      activeSpace = (await ctx.db.get(user.settings.defaultSpaceId)) as Doc<"spaces"> | null
    }

    // Task loading — narrow to project if one is active, otherwise space-wide.
    let pendingTasks
    if (activeProject) {
      pendingTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_project_status", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject!._id).eq("status", "pending")
        )
        .order("desc")
        .take(taskLimit)
    } else if (activeSpace) {
      pendingTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_space_status", (q) =>
          q.eq("userId", user._id).eq("spaceId", activeSpace!._id).eq("status", "pending")
        )
        .order("desc")
        .take(taskLimit)
    } else {
      pendingTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "pending"))
        .order("desc")
        .take(taskLimit)
    }

    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "in_progress"))
      .collect()

    // Memory loading with scope bubbling:
    //   - project scope: project + space + global
    //   - space scope:   space + all its projects' memories + global
    //   - none (global): global only
    const allUserMemories = await ctx.db
      .query("memories")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(memoryLimit * 6)

    let projectMemories: Doc<"memories">[] | undefined
    let spaceMemories: Doc<"memories">[] = []
    if (activeProject) {
      projectMemories = allUserMemories
        .filter((m) => m.projectId === activeProject!._id)
        .slice(0, memoryLimit)
      spaceMemories = allUserMemories
        .filter((m) => m.spaceId === activeProject!.spaceId && !m.projectId)
        .slice(0, memoryLimit)
    } else if (activeSpace) {
      // Include every memory whose spaceId matches (space-level + any project
      // within that space).
      spaceMemories = allUserMemories
        .filter((m) => m.spaceId === activeSpace!._id)
        .slice(0, memoryLimit)
    }

    const globalMemories = allUserMemories
      .filter((m) => !m.projectId && !m.spaceId)
      .slice(0, memoryLimit)

    const recentMemories = activeProject
      ? [...(projectMemories ?? []), ...spaceMemories, ...globalMemories].slice(0, memoryLimit * 2)
      : activeSpace
        ? [...spaceMemories, ...globalMemories].slice(0, memoryLimit * 2)
        : globalMemories

    // Get all active spaces and the active space's projects
    const spaces = await ctx.db
      .query("spaces")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "active"))
      .collect()

    const projects = activeSpace
      ? await ctx.db
          .query("projects")
          .withIndex("by_user_space_status", (q) =>
            q.eq("userId", user._id).eq("spaceId", activeSpace!._id).eq("status", "active")
          )
          .collect()
      : []

    // Active cycle: prefer project-scoped cycle, fall back to space-scoped.
    let activeCycle = null
    if (activeProject) {
      activeCycle = await ctx.db
        .query("cycles")
        .withIndex("by_user_project_status", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject!._id).eq("status", "active")
        )
        .first()
    }
    if (!activeCycle && activeSpace) {
      activeCycle = await ctx.db
        .query("cycles")
        .withIndex("by_user_space_status", (q) =>
          q.eq("userId", user._id).eq("spaceId", activeSpace!._id).eq("status", "active")
        )
        .first()
    }

    // Effective config (merge: project overrides, else inherit from space).
    const effectiveConfig = activeSpace
      ? {
          statuses: activeProject?.statuses ?? activeSpace.statuses,
          labels: activeProject?.labels ?? activeSpace.labels,
          members: activeProject?.members ?? activeSpace.members,
          estimateScale: activeProject?.estimateScale ?? activeSpace.estimateScale,
          persona: activeProject?.persona ?? activeSpace.persona,
        }
      : undefined

    const configSource = activeSpace
      ? {
          statuses: (activeProject ? "project" : "space") as "project" | "space",
          labels: (activeProject ? "project" : "space") as "project" | "space",
          members: (activeProject ? "project" : "space") as "project" | "space",
          estimateScale: (activeProject?.estimateScale ? "project" : "space") as
            | "project"
            | "space",
          persona: (activeProject?.persona ? "project" : activeSpace.persona ? "space" : null) as
            | "project"
            | "space"
            | null,
        }
      : undefined

    return {
      activeSpace,
      activeProject,
      taskSummary: {
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        topPending: pendingTasks,
      },
      recentMemories,
      memories: {
        ...(projectMemories ? { project: projectMemories } : {}),
        space: spaceMemories,
        global: globalMemories,
      },
      spaces: spaces.map((s) => ({ id: s._id, name: s.name })),
      projects: projects.map((p) => ({ id: p._id, name: p.name, slug: p.slug })),
      persona: effectiveConfig?.persona,
      spaceConfig: effectiveConfig,
      configSource,
      activeCycle,
      memorySettings: activeSpace?.memorySettings,
      workspace: workspaceInfo,
    }
  },
})
