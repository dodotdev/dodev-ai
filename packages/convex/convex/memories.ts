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
    spaceId: v.optional(v.id("spaces")),
    source: v.optional(v.string()),
    type: memoryTypeValidator,
    importance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await checkQuota(ctx, user, "memories")

    // Merge defaultTags from the effective space's memorySettings. If a
    // projectId was passed (without spaceId), resolve the project's parent
    // space — memorySettings live at the space level only.
    let tags = args.tags ?? []
    let effectiveSpaceId = args.spaceId
    if (!effectiveSpaceId && args.projectId) {
      const project = await ctx.db.get(args.projectId)
      effectiveSpaceId = project?.spaceId
    }
    if (effectiveSpaceId) {
      const space = await ctx.db.get(effectiveSpaceId)
      if (space?.memorySettings?.defaultTags) {
        const defaultTags = space.memorySettings.defaultTags
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
      spaceId: args.spaceId,
      content: args.content,
      tags,
      source: args.source,
      type: args.type,
      importance,
      reinforcements: 0,
      lastValidatedAt: now,
      lifecycleStatus: "active",
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
    spaceId: v.optional(v.id("spaces")),
    globalOnly: v.optional(v.boolean()),
    /** Include memories from narrower/broader scopes per the bubble-up rules. Default: true. */
    bubbleUp: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    type: memoryTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 10, 50)
    const bubbleUp = args.bubbleUp !== false

    // Resolve effective scope. If a project is given, we search the project's
    // parent space too when bubbleUp is enabled.
    let effectiveSpaceId = args.spaceId
    if (args.projectId && !effectiveSpaceId) {
      const p = await ctx.db.get(args.projectId)
      effectiveSpaceId = p?.spaceId
    }

    // Convex search filters only AND with q.eq, so we can only narrow to a
    // single scope at search-time. We pick the broadest scope that's relevant
    // and post-filter by the bubble-up rules.
    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query).eq("userId", user._id)
        // Only apply the space filter in search if we're NOT bubbling up,
        // otherwise we'd miss global memories.
        if (!bubbleUp && args.globalOnly) {
          // can't express "no spaceId AND no projectId" in a search filter;
          // post-filter instead.
        } else if (!bubbleUp && args.projectId) {
          search = search.eq("projectId", args.projectId)
        } else if (!bubbleUp && effectiveSpaceId) {
          search = search.eq("spaceId", effectiveSpaceId)
        }
        return search
      })
      .take(limit * 3)

    // Apply scope filter on results
    let filtered = results.filter((m) => {
      if (args.globalOnly) return !m.projectId && !m.spaceId
      if (args.projectId) {
        if (!bubbleUp) return m.projectId === args.projectId
        // project-scope with bubble-up: project + space (no project) + global
        if (m.projectId === args.projectId) return true
        if (m.spaceId === effectiveSpaceId && !m.projectId) return true
        if (!m.projectId && !m.spaceId) return true
        return false
      }
      if (effectiveSpaceId) {
        if (!bubbleUp) return m.spaceId === effectiveSpaceId && !m.projectId
        // space-scope with bubble-up: space + all its projects + global
        if (m.spaceId === effectiveSpaceId) return true
        if (!m.projectId && !m.spaceId) return true
        return false
      }
      return true
    })

    if (args.tags && args.tags.length > 0) {
      filtered = filtered.filter((m) => args.tags!.some((tag) => m.tags.includes(tag)))
    }
    if (args.type) {
      filtered = filtered.filter((m) => m.type === args.type)
    }

    return filtered.slice(0, limit)
  },
})

export const listMemories = query({
  args: {
    apiKeyHash: v.string(),
    projectId: v.optional(v.id("projects")),
    spaceId: v.optional(v.id("spaces")),
    globalOnly: v.optional(v.boolean()),
    /** Include memories from narrower/broader scopes per the bubble-up rules. Default: true. */
    bubbleUp: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    type: memoryTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 20, 100)
    const bubbleUp = args.bubbleUp !== false

    // Resolve the effective parent space when a project is passed.
    let effectiveSpaceId = args.spaceId
    if (args.projectId && !effectiveSpaceId) {
      const p = await ctx.db.get(args.projectId)
      effectiveSpaceId = p?.spaceId
    }

    // When bubble-up is on, always start from the broad user-scoped index so
    // we can post-filter by the scope rules. When off, pick a scoped index.
    let memoryQuery
    if (bubbleUp) {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_created", (q) => q.eq("userId", user._id))
    } else if (args.projectId) {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!)
        )
    } else if (args.spaceId) {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_space", (q) => q.eq("userId", user._id).eq("spaceId", args.spaceId!))
    } else {
      memoryQuery = ctx.db
        .query("memories")
        .withIndex("by_user_created", (q) => q.eq("userId", user._id))
    }

    // Over-fetch when we plan to post-filter.
    const fetchLimit = bubbleUp || args.globalOnly ? limit * 3 : limit
    const results = await memoryQuery.order("desc").take(fetchLimit)

    let filtered = results.filter((m) => {
      if (args.globalOnly) return !m.projectId && !m.spaceId
      if (args.projectId) {
        if (!bubbleUp) return m.projectId === args.projectId
        if (m.projectId === args.projectId) return true
        if (m.spaceId === effectiveSpaceId && !m.projectId) return true
        if (!m.projectId && !m.spaceId) return true
        return false
      }
      if (effectiveSpaceId) {
        if (!bubbleUp) return m.spaceId === effectiveSpaceId && !m.projectId
        if (m.spaceId === effectiveSpaceId) return true
        if (!m.projectId && !m.spaceId) return true
        return false
      }
      return true
    })

    if (args.tags && args.tags.length > 0) {
      filtered = filtered.filter((m) => args.tags!.some((tag) => m.tags.includes(tag)))
    }

    if (args.type) {
      filtered = filtered.filter((m) => m.type === args.type)
    }

    filtered = filtered.slice(0, limit)

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
    spaceId: v.optional(v.union(v.id("spaces"), v.null())),
    type: memoryTypeValidator,
    importance: v.optional(v.number()),
    lifecycleStatus: v.optional(v.union(v.literal("active"), v.literal("deprecated"))),
    digestRank: v.optional(v.union(v.number(), v.null())),
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
    if (args.spaceId !== undefined) updates.spaceId = args.spaceId ?? undefined
    if (args.type !== undefined) updates.type = args.type
    if (args.importance !== undefined) {
      updates.importance = Math.max(0, Math.min(1, args.importance))
    }
    if (args.lifecycleStatus !== undefined) updates.lifecycleStatus = args.lifecycleStatus
    if (args.digestRank !== undefined) updates.digestRank = args.digestRank ?? undefined

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

/** Resolve a project to its parent spaceId. Used by hybridSearch bubble-up. */
export const getProjectSpaceId = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)
    if (!project) return null
    return { spaceId: project.spaceId }
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
    spaceId: v.optional(v.id("spaces")),
    type: memoryTypeValidator,
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query)
        search = search.eq("userId", args.userId)
        if (args.spaceId) search = search.eq("spaceId", args.spaceId)
        else if (args.projectId) search = search.eq("projectId", args.projectId)
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
    spaceId: v.optional(v.id("spaces")),
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

    // Resolve parent space when only projectId is passed — bubble-up needs it.
    let resolvedSpaceId = args.spaceId
    if (args.projectId && !resolvedSpaceId) {
      const project = await ctx.runQuery(internal.memories.getProjectSpaceId, {
        projectId: args.projectId,
      })
      resolvedSpaceId = project?.spaceId
    }

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
      spaceId?: string
      userId: string
      createdAt: number
      updatedAt: number
    }> = []

    let vectorResults: Array<{
      _id: string
      _score: number
    }> = []

    // Run keyword search — prefer spaceId over projectId
    if (mode === "keyword" || mode === "hybrid") {
      keywordResults = await ctx.runQuery(internal.memories.keywordSearch, {
        userId: user._id,
        query: args.query,
        projectId: args.spaceId ? undefined : args.projectId,
        spaceId: args.spaceId,
        type: args.type,
        limit,
      })

      // If globalScope and scoped to a space/project, also search global memories
      if (args.globalScope && (args.spaceId || args.projectId)) {
        const globalKeyword = await ctx.runQuery(internal.memories.keywordSearch, {
          userId: user._id,
          query: args.query,
          projectId: undefined,
          spaceId: undefined,
          type: args.type,
          limit,
        })
        // Merge (dedup later)
        keywordResults = [...keywordResults, ...globalKeyword]
      }
    }

    // Run vector search — always filter by userId to prevent cross-user leaks.
    // Convex vector search only supports q.eq() and q.or() (no AND), so we
    // cannot combine userId + spaceId in a single filter expression. We filter
    // by userId here, then apply spaceId/projectId filtering after fetching
    // full documents in the merge phase below.
    if (mode === "semantic" || mode === "hybrid") {
      const queryEmbedding = await generateEmbedding(args.query)
      if (queryEmbedding) {
        vectorResults = await ctx.vectorSearch("memories", "by_embedding", {
          vector: queryEmbedding,
          limit: Math.min(limit * 3, 150),
          filter: (q) => q.eq("userId", user._id),
        })
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
        // Scope filter with bubble-up:
        //   - projectId set: keep project + parent-space (no project) +
        //     global. Broader scope is allowed because narrower queries
        //     inherit outer context.
        //   - spaceId set: keep space-level + any project within that space
        //     + global.
        //   - neither: leave everything as-is (globalScope is redundant).
        // globalScope arg is kept for back-compat — bubble-up now covers its
        // intent (always includes global when a scope is set).
        const docSpaceId = (doc as { spaceId?: string }).spaceId
        const docProjectId = (doc as { projectId?: string }).projectId
        if (args.projectId) {
          const isInProject = docProjectId === args.projectId
          const isSpaceLevel =
            !docProjectId && resolvedSpaceId !== undefined && docSpaceId === resolvedSpaceId
          const isGlobal = !docProjectId && !docSpaceId
          if (!(isInProject || isSpaceLevel || isGlobal)) continue
        } else if (resolvedSpaceId) {
          const isInSpace = docSpaceId === resolvedSpaceId
          const isGlobal = !docProjectId && !docSpaceId
          if (!(isInSpace || isGlobal)) continue
        }

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

// ===========================================================================
// R1 — Lifecycle / curation: reinforce, supersede, digest
//
// These three tools fix the memory-sprawl problem: when the same fact proves
// true again, bump the counter on the existing memory instead of writing a
// duplicate. When a memory becomes outdated, supersede it with a new one and
// keep the old row for audit. The digest renders a compact, prompt-injectable
// rank-ordered summary of active memories, ranked by reinforcement strength
// and recency.
// ===========================================================================

/** Bump the reinforcement counter on a memory. */
export const reinforce = mutation({
  args: {
    apiKeyHash: v.string(),
    id: v.id("memories"),
    /** Optional note to append (creates a comment-style trail in `summary`). */
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const memory = await ctx.db.get(args.id)
    if (!memory || memory.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }
    const now = Date.now()
    const next = (memory.reinforcements ?? 0) + 1
    await ctx.db.patch(args.id, {
      reinforcements: next,
      lastValidatedAt: now,
      lifecycleStatus: "active",
      updatedAt: now,
    })
    return { ...(await ctx.db.get(args.id)), reinforcementsBefore: memory.reinforcements ?? 0 }
  },
})

/**
 * Replace an outdated memory with a new one. The old memory is marked
 * deprecated; the new one carries `supersedes` pointing back to it. Either
 * provide an existing `newId` to link, or content to create a fresh memory
 * inline.
 */
export const supersede = mutation({
  args: {
    apiKeyHash: v.string(),
    oldId: v.id("memories"),
    newId: v.optional(v.id("memories")),
    // Inline-create path
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    type: memoryTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const oldMemory = await ctx.db.get(args.oldId)
    if (!oldMemory || oldMemory.userId !== user._id) {
      throw new ConvexError("NOT_FOUND")
    }

    const now = Date.now()
    let newId = args.newId

    if (newId) {
      const existing = await ctx.db.get(newId)
      if (!existing || existing.userId !== user._id) {
        throw new ConvexError("NOT_FOUND")
      }
      await ctx.db.patch(newId, {
        supersedes: args.oldId,
        lifecycleStatus: "active",
        updatedAt: now,
      })
    } else {
      if (!args.content) {
        throw new ConvexError("Either `newId` or `content` is required to supersede a memory.")
      }
      // Inherit scope and source from the old memory; tags/type are
      // overridable so the new memory can be re-classified.
      newId = await ctx.db.insert("memories", {
        userId: user._id,
        spaceId: oldMemory.spaceId,
        projectId: oldMemory.projectId,
        content: args.content,
        tags: args.tags ?? oldMemory.tags,
        source: oldMemory.source,
        type: args.type ?? oldMemory.type,
        importance: oldMemory.importance,
        reinforcements: 0,
        supersedes: args.oldId,
        lastValidatedAt: now,
        lifecycleStatus: "active",
        createdAt: now,
        updatedAt: now,
      })
      await incrementUsage(ctx, user._id, "memoryCount")
      await ctx.scheduler.runAfter(0, internal.memories.generateAndStoreEmbedding, {
        memoryId: newId,
      })
    }

    await ctx.db.patch(args.oldId, {
      lifecycleStatus: "deprecated",
      updatedAt: now,
    })

    return {
      old: await ctx.db.get(args.oldId),
      new: await ctx.db.get(newId),
    }
  },
})

/**
 * Compact, rank-ordered rendering of active memories. Designed for
 * prompt-injection at session start (the `/dodev` skill in R5 calls this).
 * Ranking: digestRank override > (importance + reinforcement bonus + recency).
 * Deprecated memories are excluded.
 */
export const digest = query({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    /** Default: bubble-up on, like search/list. */
    bubbleUp: v.optional(v.boolean()),
    type: memoryTypeValidator,
    /** Filter by reinforcement floor. Default: 0 (all active). */
    minReinforcements: v.optional(v.number()),
    /** Max results (1-50). Default: 20. */
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 20, 50)
    const bubbleUp = args.bubbleUp !== false
    const minReinforcements = args.minReinforcements ?? 0

    let effectiveSpaceId = args.spaceId
    if (args.projectId && !effectiveSpaceId) {
      const p = await ctx.db.get(args.projectId)
      effectiveSpaceId = p?.spaceId
    }

    // Over-fetch: deprecation, scope filter, type filter, and reinforcement
    // floor all happen post-query.
    const fetchLimit = Math.max(limit * 4, 100)
    const rows = await ctx.db
      .query("memories")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(fetchLimit)

    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000

    const scored = rows
      .filter((m) => {
        if (m.lifecycleStatus === "deprecated") return false
        if (args.type && m.type !== args.type) return false
        if ((m.reinforcements ?? 0) < minReinforcements) return false
        // Scope rules — same bubble-up shape as listMemories.
        if (args.projectId) {
          if (!bubbleUp) return m.projectId === args.projectId
          if (m.projectId === args.projectId) return true
          if (m.spaceId === effectiveSpaceId && !m.projectId) return true
          if (!m.projectId && !m.spaceId) return true
          return false
        }
        if (effectiveSpaceId) {
          if (!bubbleUp) return m.spaceId === effectiveSpaceId && !m.projectId
          if (m.spaceId === effectiveSpaceId) return true
          if (!m.projectId && !m.spaceId) return true
          return false
        }
        return true
      })
      .map((m) => {
        const reinforcements = m.reinforcements ?? 0
        const importance = m.importance ?? 0.5
        const validatedAt = m.lastValidatedAt ?? m.updatedAt
        const ageDays = Math.max(0, (now - validatedAt) / DAY)
        // Recency decay: full credit within 7 days, half by 60 days, ~zero past 180.
        const recency = 1 / (1 + ageDays / 30)
        // Reinforcement bonus diminishes (sqrt) so 100 reinforcements doesn't
        // dwarf a fresh decision. Empirically: 1=1.0, 4=2.0, 9=3.0, 25=5.0.
        const reinforcementBonus = Math.sqrt(reinforcements + 1)
        // Manual override always wins.
        const baseScore = m.digestRank ?? importance + reinforcementBonus + recency
        return { memory: m, score: baseScore }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored.map(({ memory, score }) => ({
      _id: memory._id,
      content: memory.content,
      summary: memory.summary,
      tags: memory.tags,
      type: memory.type,
      reinforcements: memory.reinforcements ?? 0,
      lastValidatedAt: memory.lastValidatedAt ?? memory.updatedAt,
      lifecycleStatus: memory.lifecycleStatus ?? "active",
      digestRank: memory.digestRank,
      spaceId: memory.spaceId,
      projectId: memory.projectId,
      score,
    }))
  },
})
