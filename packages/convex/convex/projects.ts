import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey, checkQuota } from "./lib/auth"
import { generateConfigId, incrementUsage } from "./lib/utils"

const DEFAULT_STATUSES = [
  { name: "Backlog", category: "pending" as const, color: "#6b7280", position: 0 },
  { name: "Todo", category: "pending" as const, color: "#f59e0b", position: 1 },
  { name: "In Progress", category: "in_progress" as const, color: "#3b82f6", position: 2 },
  { name: "In Review", category: "in_progress" as const, color: "#8b5cf6", position: 3 },
  { name: "Done", category: "completed" as const, color: "#10b981", position: 4 },
  { name: "Cancelled", category: "cancelled" as const, color: "#ef4444", position: 5 },
]

const DEFAULT_ESTIMATE_SCALE = {
  type: "points" as const,
  values: ["1", "2", "3", "5", "8", "13", "21"],
}

/** Derive a stub from a project name: take uppercase initials, or first word uppercase, max 5 chars */
function deriveStub(name: string): string {
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
    stub: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await checkQuota(ctx, user, "projects")

    // Determine stub: use provided or derive from name
    let stub = (args.stub?.trim().toUpperCase() || deriveStub(args.name)).replace(
      /[^A-Z0-9]/g,
      ""
    )
    if (!stub) stub = "PRJ"

    // Ensure uniqueness for this user -- append a digit if taken
    let candidate = stub
    let suffix = 1
    while (true) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_user_stub", (q) => q.eq("userId", user._id).eq("stub", candidate))
        .first()
      if (!existing) break
      candidate = `${stub}${suffix}`
      suffix++
    }
    stub = candidate

    const now = Date.now()
    const id = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      stub,
      description: args.description,
      status: "active",
      todoCounter: 0,
      issueCounter: 0,
      metadata: args.metadata,
      statuses: DEFAULT_STATUSES.map((s) => ({
        ...s,
        id: generateConfigId("st"),
      })),
      labels: [],
      members: [],
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
          const todos = await ctx.db
            .query("todos")
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
              totalTodos: todos.length,
              pendingTodos: todos.filter((t) => t.status === "pending").length,
              inProgressTodos: todos.filter((t) => t.status === "in_progress").length,
              completedTodos: todos.filter((t) => t.status === "completed").length,
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
      throw new ConvexError("NOT_FOUND")
    }
    return project
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("projects"),
    name: v.optional(v.string()),
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

export const getContext = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    todoLimit: v.optional(v.number()),
    memoryLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const todoLimit = args.todoLimit ?? 10
    const memoryLimit = args.memoryLimit ?? 5

    // Get active project
    const activeProject = args.projectId
      ? await ctx.db.get(args.projectId)
      : user.settings.defaultProjectId
        ? await ctx.db.get(user.settings.defaultProjectId)
        : null

    // Get pending todos (scoped to project if active)
    let pendingTodos
    if (activeProject) {
      pendingTodos = await ctx.db
        .query("todos")
        .withIndex("by_user_project_status", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject._id).eq("status", "pending")
        )
        .order("desc")
        .take(todoLimit)
    } else {
      pendingTodos = await ctx.db
        .query("todos")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "pending"))
        .order("desc")
        .take(todoLimit)
    }

    // Get in-progress todos
    const inProgressTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "in_progress"))
      .collect()

    // Get recent memories
    let recentMemories
    if (activeProject) {
      recentMemories = await ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", activeProject._id)
        )
        .order("desc")
        .take(memoryLimit)
    } else {
      recentMemories = await ctx.db
        .query("memories")
        .withIndex("by_user_created", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(memoryLimit)
    }

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
          q
            .eq("userId", user._id)
            .eq("projectId", activeProject._id)
            .eq("status", "active")
        )
        .first()
    }

    return {
      activeProject,
      todoSummary: {
        pending: pendingTodos.length,
        inProgress: inProgressTodos.length,
        topPending: pendingTodos,
      },
      recentMemories,
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
    }
  },
})
