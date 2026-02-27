import { ConvexError, v } from "convex/values"
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

/** Derive a slug from a project name: take uppercase initials, or first word uppercase, max 5 chars */
function deriveSlug(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    // Use initials: "My Project" -> "MP"
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 5)
  }
  // Single word: take first 3 chars uppercase
  return words[0].toUpperCase().slice(0, 5)
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
    await checkQuota(ctx, user, "projects")

    // Determine slug: use provided or derive from name
    let slug = (args.slug?.trim().toUpperCase() || deriveSlug(args.name)).replace(/[^A-Z0-9]/g, "")
    if (!slug) slug = "PRJ"

    // Ensure global uniqueness -- append a digit if taken
    let candidate = slug
    let suffix = 1
    while (true) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_slug", (q) => q.eq("slug", candidate))
        .first()
      if (!existing) break
      candidate = `${slug}${suffix}`
      suffix++
    }
    slug = candidate

    const now = Date.now()
    const id = await ctx.db.insert("projects", {
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

    await incrementUsage(ctx, user._id, "projectCount")
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

    let projects
    if (args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user_status", (q) =>
          q
            .eq("userId", user._id)
            .eq("status", args.status as "active" | "paused" | "completed" | "archived")
        )
        .collect()
    } else {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.neq(q.field("status"), "archived"))
        .collect()
    }

    if (args.includeStats) {
      return await Promise.all(
        projects.map(async (project) => {
          const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user_project", (q) =>
              q.eq("userId", user._id).eq("projectId", project._id)
            )
            .collect()

          const memories = await ctx.db
            .query("memories")
            .withIndex("by_user_project", (q) =>
              q.eq("userId", user._id).eq("projectId", project._id)
            )
            .collect()

          return {
            ...project,
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

    return projects
  },
})

export const get = query({
  args: {
    apiKeyHash: v.string(),
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) {
      return null
    }
    return project
  },
})

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
      // Ensure global uniqueness
      const existing = await ctx.db
        .query("projects")
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
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) {
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
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    // Delete all project data
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const task of tasks) await ctx.db.delete(task._id)

    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const issue of issues) await ctx.db.delete(issue._id)

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const memory of memories) await ctx.db.delete(memory._id)

    const cycles = await ctx.db
      .query("cycles")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.id))
      .collect()
    for (const cycle of cycles) await ctx.db.delete(cycle._id)

    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

// --- Project linking for workspace auto-detection ---

/** Normalize a repo URL: strip protocol, trailing .git, lowercase */
function normalizeRepoUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^git@([^:]+):/, "$1/")
    .replace(/\.git$/, "")
    .toLowerCase()
}

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
      if (!paths.includes(args.path)) {
        updates.linkedPaths = [...paths, args.path]
      }
    }

    if (args.repo) {
      const normalized = normalizeRepoUrl(args.repo)
      const repos = project.linkedRepos ?? []
      if (!repos.includes(normalized)) {
        updates.linkedRepos = [...repos, normalized]
      }
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

export const resolveProjectByWorkspace = query({
  args: {
    apiKeyHash: v.string(),
    repoUrl: v.optional(v.string()),
    workspacePath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    if (!args.repoUrl && !args.workspacePath) return null

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.neq(q.field("status"), "archived"))
      .collect()

    const normalizedRepo = args.repoUrl ? normalizeRepoUrl(args.repoUrl) : null

    for (const project of projects) {
      // Check repo match first (more specific)
      if (normalizedRepo && project.linkedRepos?.includes(normalizedRepo)) {
        return project
      }
      // Check path match
      if (args.workspacePath && project.linkedPaths?.includes(args.workspacePath)) {
        return project
      }
    }

    return null
  },
})

export const getContext = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    taskLimit: v.optional(v.number()),
    memoryLimit: v.optional(v.number()),
    workspacePath: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const taskLimit = args.taskLimit ?? 10
    const memoryLimit = args.memoryLimit ?? 5

    // Resolve project: explicit > workspace detection > default
    let activeProject = null
    let workspaceInfo:
      | { detectedPath?: string; detectedRepo?: string; resolvedProjectId?: string }
      | undefined

    if (args.projectId) {
      activeProject = await ctx.db.get(args.projectId)
    } else if (args.repoUrl || args.workspacePath) {
      // Try workspace-based auto-detection
      const normalizedRepo = args.repoUrl ? normalizeRepoUrl(args.repoUrl) : null

      const allProjects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.neq(q.field("status"), "archived"))
        .collect()

      for (const project of allProjects) {
        if (normalizedRepo && project.linkedRepos?.includes(normalizedRepo)) {
          activeProject = project
          break
        }
        if (args.workspacePath && project.linkedPaths?.includes(args.workspacePath)) {
          activeProject = project
          break
        }
      }

      workspaceInfo = {
        detectedPath: args.workspacePath,
        detectedRepo: args.repoUrl,
        resolvedProjectId: activeProject?._id,
      }
    }

    if (!activeProject && user.settings.defaultProjectId) {
      activeProject = await ctx.db.get(user.settings.defaultProjectId)
    }

    // Get pending tasks (scoped to project if active)
    let pendingTasks
    if (activeProject) {
      pendingTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_project_status", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject!._id).eq("status", "pending")
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

    // Get in-progress tasks
    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "in_progress"))
      .collect()

    // Get memories — project-scoped + global
    const allUserMemories = await ctx.db
      .query("memories")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(memoryLimit * 3)

    let projectMemories = activeProject
      ? allUserMemories.filter((m) => m.projectId === activeProject._id).slice(0, memoryLimit)
      : []

    // If project memories are sparse, also query directly
    if (activeProject && projectMemories.length < memoryLimit) {
      const directProjectMemories = await ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject!._id)
        )
        .order("desc")
        .take(memoryLimit)
      // Merge and deduplicate
      const seen = new Set(projectMemories.map((m) => m._id))
      for (const m of directProjectMemories) {
        if (!seen.has(m._id)) {
          projectMemories.push(m)
          seen.add(m._id)
        }
      }
      projectMemories = projectMemories.slice(0, memoryLimit)
    }

    const globalMemories = allUserMemories.filter((m) => !m.projectId).slice(0, memoryLimit)

    const recentMemories = activeProject
      ? [...projectMemories, ...globalMemories].slice(0, memoryLimit * 2)
      : allUserMemories.slice(0, memoryLimit)

    // Get all active projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "active"))
      .collect()

    // Get active cycle for the project
    let activeCycle = null
    if (activeProject) {
      activeCycle = await ctx.db
        .query("cycles")
        .withIndex("by_user_project_status", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject!._id).eq("status", "active")
        )
        .first()
    }

    return {
      activeProject,
      taskSummary: {
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        topPending: pendingTasks,
      },
      recentMemories,
      memories: {
        project: projectMemories,
        global: globalMemories,
      },
      projects: projects.map((p) => ({ id: p._id, name: p.name })),
      persona: activeProject?.persona,
      projectConfig: activeProject
        ? {
            statuses: activeProject.statuses,
            labels: activeProject.labels,
            members: activeProject.members,
            estimateScale: activeProject.estimateScale,
            persona: activeProject.persona,
          }
        : undefined,
      activeCycle,
      memorySettings: activeProject?.memorySettings,
      workspace: workspaceInfo,
    }
  },
})
