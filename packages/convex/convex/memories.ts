import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { authenticateApiKey, checkQuota } from "./lib/auth"
import { generateEmbedding } from "./lib/embeddings"
import { incrementUsage } from "./lib/utils"

const memoryTypeValidator = v.optional(
  v.union(
    v.literal("fact"),
    v.literal("decision"),
    v.literal("preference"),
    v.literal("context"),
    v.literal("learning")
  )
)

export const add = mutation({
  args: {
    apiKeyHash: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    projectId: v.optional(v.id("projects")),
    source: v.optional(v.string()),
    type: memoryTypeValidator,
    importance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await checkQuota(ctx, user, "memories")

    // Merge project's defaultTags if configured
    let tags = args.tags ?? []
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId)
      if (project?.memorySettings?.defaultTags) {
        const defaultTags = project.memorySettings.defaultTags
        tags = [...new Set([...tags, ...defaultTags])]
      }
    }

    // Clamp importance to 0.0-1.0
    const importance =
      args.importance !== undefined ? Math.max(0, Math.min(1, args.importance)) : undefined

    const now = Date.now()
    const id = await ctx.db.insert("memories", {
      userId: user._id,
      projectId: args.projectId,
      content: args.content,
      tags,
      source: args.source,
      type: args.type,
      importance,
      createdAt: now,
      updatedAt: now,
    })

    await incrementUsage(ctx, user._id, "memoryCount")

    // Schedule embedding generation asynchronously
    await ctx.scheduler.runAfter(0, internal.memories.generateAndStoreEmbedding, {
      memoryId: id,
    })

    return await ctx.db.get(id)
  },
})

export const search = query({
  args: {
    apiKeyHash: v.string(),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    globalOnly: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    type: memoryTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 10, 50)

    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query)
        search = search.eq("userId", user._id)
        if (args.projectId) search = search.eq("projectId", args.projectId)
        return search
      })
      .take(limit)

    let filtered = results

    // Global-only: exclude project-scoped memories
    if (args.globalOnly) {
      filtered = filtered.filter((m) => !m.projectId)
    }

    // Filter by tags if specified
    if (args.tags && args.tags.length > 0) {
      filtered = filtered.filter((m) => args.tags!.some((tag) => m.tags.includes(tag)))
    }

    // Filter by type if specified
    if (args.type) {
      filtered = filtered.filter((m) => m.type === args.type)
    }

    return filtered
  },
})

export const listMemories = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    globalOnly: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    type: memoryTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 20, 100)

    let memoryQuery
    if (args.projectId) {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!)
        )
    } else if (args.globalOnly) {
      // Only return memories with no projectId
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", undefined)
        )
    } else {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_created", (q) => q.eq("userId", user._id))
    }

    const results = await memoryQuery.order("desc").take(limit)

    let filtered = results

    if (args.tags && args.tags.length > 0) {
      filtered = filtered.filter((m) => args.tags!.some((tag) => m.tags.includes(tag)))
    }

    if (args.type) {
      filtered = filtered.filter((m) => m.type === args.type)
    }

    return filtered
  },
})

export const update = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("memories"),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
    type: memoryTypeValidator,
    importance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const memory = await ctx.db.get(args.id)
    if (!memory || memory.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.content !== undefined) updates.content = args.content
    if (args.tags !== undefined) updates.tags = args.tags
    if (args.projectId !== undefined) updates.projectId = args.projectId ?? undefined
    if (args.type !== undefined) updates.type = args.type
    if (args.importance !== undefined) {
      updates.importance = Math.max(0, Math.min(1, args.importance))
    }

    await ctx.db.patch(args.id, updates)

    // Re-generate embedding if content changed
    if (args.content !== undefined) {
      await ctx.scheduler.runAfter(0, internal.memories.generateAndStoreEmbedding, {
        memoryId: args.id,
      })
    }

    return await ctx.db.get(args.id)
  },
})

export const remove = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("memories"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const memory = await ctx.db.get(args.id)
    if (!memory || memory.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    await ctx.db.delete(args.id)
    return { deleted: true, id: args.id }
  },
})

// --- Internal functions for embedding generation ---

export const generateAndStoreEmbedding = internalAction({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    const memory = await ctx.runQuery(internal.memories.getMemoryInternal, {
      memoryId: args.memoryId,
    })
    if (!memory) return

    const embedding = await generateEmbedding(memory.content)
    if (!embedding) return

    await ctx.runMutation(internal.memories.updateEmbedding, {
      memoryId: args.memoryId,
      embedding,
    })
  },
})

export const getMemoryInternal = internalQuery({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.memoryId)
  },
})

export const updateEmbedding = internalMutation({
  args: {
    memoryId: v.id("memories"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId)
    if (!memory) return
    await ctx.db.patch(args.memoryId, { embedding: args.embedding })
  },
})

// --- Hybrid search action ---

/** Full-text keyword search (callable from actions) */
export const keywordSearch = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    type: memoryTypeValidator,
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query)
        search = search.eq("userId", args.userId)
        if (args.projectId) search = search.eq("projectId", args.projectId)
        return search
      })
      .take(args.limit)

    let filtered = results
    if (args.type) {
      filtered = filtered.filter((m) => m.type === args.type)
    }

    return filtered
  },
})

/** Hybrid search action: combines vector + keyword search */
export const hybridSearch = action({
  args: {
    apiKeyHash: v.string(),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    tags: v.optional(v.array(v.string())),
    type: memoryTypeValidator,
    mode: v.optional(v.union(v.literal("keyword"), v.literal("semantic"), v.literal("hybrid"))),
    globalScope: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.memories.authenticateForSearch, {
      apiKeyHash: args.apiKeyHash,
    })
    if (!user) throw new ConvexError("UNAUTHORIZED")

    const limit = Math.min(args.limit ?? 10, 50)
    const mode = args.mode ?? "hybrid"

    let keywordResults: Array<{
      _id: string
      content: string
      summary?: string
      tags: string[]
      source?: string
      type?: string
      importance?: number
      embedding?: number[]
      projectId?: string
      userId: string
      createdAt: number
      updatedAt: number
    }> = []

    let vectorResults: Array<{
      _id: string
      _score: number
    }> = []

    // Run keyword search
    if (mode === "keyword" || mode === "hybrid") {
      keywordResults = await ctx.runQuery(internal.memories.keywordSearch, {
        userId: user._id,
        query: args.query,
        projectId: args.projectId,
        type: args.type,
        limit,
      })

      // If globalScope and projectId specified, also search global memories
      if (args.globalScope && args.projectId) {
        const globalKeyword = await ctx.runQuery(internal.memories.keywordSearch, {
          userId: user._id,
          query: args.query,
          projectId: undefined,
          type: args.type,
          limit,
        })
        // Merge (dedup later)
        keywordResults = [...keywordResults, ...globalKeyword]
      }
    }

    // Run vector search
    if (mode === "semantic" || mode === "hybrid") {
      const queryEmbedding = await generateEmbedding(args.query)
      if (queryEmbedding) {
        const filter: Record<string, unknown> = { userId: user._id }
        if (args.projectId) filter.projectId = args.projectId

        vectorResults = await ctx.vectorSearch("memories", "by_embedding", {
          vector: queryEmbedding,
          limit,
          filter: (q) => {
            let f = q.eq("userId", user._id)
            if (args.projectId) f = q.eq("projectId", args.projectId)
            return f
          },
        })

        // If globalScope, also search global memories
        if (args.globalScope && args.projectId) {
          const globalVector = await ctx.vectorSearch("memories", "by_embedding", {
            vector: queryEmbedding,
            limit,
            filter: (q) => q.eq("userId", user._id),
          })
          vectorResults = [...vectorResults, ...globalVector]
        }
      }
    }

    // Merge results with scoring
    const scoreMap = new Map<string, number>()

    // Keyword results: assign score based on position (1.0 for first, decreasing)
    for (let i = 0; i < keywordResults.length; i++) {
      const id = keywordResults[i]._id as string
      const score = 1.0 - i / Math.max(keywordResults.length, 1)
      const weight = mode === "hybrid" ? 0.3 : 1.0
      scoreMap.set(id, (scoreMap.get(id) ?? 0) + score * weight)
    }

    // Vector results: use the _score from vector search
    for (const result of vectorResults) {
      const id = result._id as string
      const weight = mode === "hybrid" ? 0.7 : 1.0
      scoreMap.set(id, (scoreMap.get(id) ?? 0) + result._score * weight)
    }

    // Collect unique IDs sorted by combined score
    const sortedIds = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)

    // Fetch full documents for vector-only results
    const keywordById = new Map(keywordResults.map((r) => [r._id as string, r]))
    const results = []

    for (const id of sortedIds) {
      let doc = keywordById.get(id)
      if (!doc) {
        // Need to fetch from DB
        const fetched = await ctx.runQuery(internal.memories.getMemoryInternal, {
          memoryId: id as any,
        })
        if (fetched) doc = fetched as any
      }
      if (doc) {
        // Filter by tags if specified
        if (args.tags && args.tags.length > 0) {
          if (!args.tags.some((tag) => doc!.tags.includes(tag))) continue
        }
        // Filter by type if specified
        if (args.type && doc.type !== args.type) continue

        // Strip embedding from response to save bandwidth
        const { embedding: _, ...rest } = doc
        results.push({ ...rest, _score: scoreMap.get(id) })
      }
    }

    return results
  },
})

/** Auth check usable from actions */
export const authenticateForSearch = internalQuery({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_api_key_hash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .unique()
  },
})
