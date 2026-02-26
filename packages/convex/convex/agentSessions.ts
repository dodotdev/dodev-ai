import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

/** Create a new agent session when a transport connects */
export const connect = mutation({
  args: {
    apiKeyHash: v.string(),
    sessionId: v.string(),
    clientId: v.string(),
    clientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const now = Date.now()

    // Disconnect any existing sessions with the same clientId
    // (handles reconnect without explicit disconnect)
    const existing = await ctx.db
      .query("agentSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "connected")
      )
      .collect()

    for (const session of existing) {
      if (session.clientId === args.clientId) {
        await ctx.db.patch(session._id, {
          status: "disconnected",
          disconnectedAt: now,
        })
      }
    }

    return await ctx.db.insert("agentSessions", {
      userId: user._id,
      sessionId: args.sessionId,
      clientId: args.clientId,
      clientName: args.clientName,
      status: "connected",
      connectedAt: now,
      lastActivityAt: now,
      toolCallCount: 0,
    })
  },
})

/** Update last activity on a tool call */
export const heartbeat = mutation({
  args: {
    apiKeyHash: v.string(),
    sessionId: v.string(),
    toolName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await authenticateApiKey(ctx, args.apiKeyHash)

    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique()

    if (!session || session.status !== "connected") return

    await ctx.db.patch(session._id, {
      lastActivityAt: Date.now(),
      toolCallCount: session.toolCallCount + 1,
      ...(args.toolName ? { lastTool: args.toolName } : {}),
    })
  },
})

/** Mark a session as disconnected when transport closes */
export const disconnect = mutation({
  args: {
    apiKeyHash: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticateApiKey(ctx, args.apiKeyHash)

    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique()

    if (!session || session.status !== "connected") return

    await ctx.db.patch(session._id, {
      status: "disconnected",
      disconnectedAt: Date.now(),
    })
  },
})

/** List active (connected) sessions for the authenticated user */
export const listActive = query({
  args: {
    apiKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)

    return await ctx.db
      .query("agentSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "connected")
      )
      .order("desc")
      .collect()
  },
})

/** List recent sessions (any status) for the authenticated user */
export const listRecent = query({
  args: {
    apiKeyHash: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const limit = Math.min(args.limit ?? 20, 100)

    return await ctx.db
      .query("agentSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit)
  },
})

/** Expire stale sessions (no activity for 5 minutes). Called by cron. */
export const expireStaleSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 5 * 60 * 1000
    const now = Date.now()

    // Find connected sessions with old lastActivityAt
    const stale = await ctx.db
      .query("agentSessions")
      .withIndex("by_last_activity", (q) => q.lt("lastActivityAt", cutoff))
      .take(200)

    let expired = 0
    for (const session of stale) {
      if (session.status === "connected") {
        await ctx.db.patch(session._id, {
          status: "expired",
          disconnectedAt: now,
        })
        expired++
      }
    }

    return { expired }
  },
})

/** Delete old disconnected/expired sessions (older than 30 days). Called by cron. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000

    const old = await ctx.db
      .query("agentSessions")
      .withIndex("by_last_activity", (q) => q.lt("lastActivityAt", cutoff))
      .take(500)

    let deleted = 0
    for (const session of old) {
      if (session.status !== "connected") {
        await ctx.db.delete(session._id)
        deleted++
      }
    }

    return { deleted }
  },
})
