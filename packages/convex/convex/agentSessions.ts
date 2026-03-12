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
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const now = Date.now()

    // Disconnect any existing session with the same sessionId
    const existingBySession = await ctx.db
      .query("agentSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique()

    if (existingBySession && existingBySession.status === "connected") {
      await ctx.db.patch(existingBySession._id, {
        status: "disconnected",
        disconnectedAt: now,
      })
    }

    // If we have an agentId, disconnect all previous sessions for this agent.
    // agentId is unique per OAuth authorization and persists across reconnections
    // and token refreshes. When the same agent reconnects (new sessionId, same agentId),
    // we know the old session is stale and can safely disconnect it.
    if (args.agentId) {
      const existingByAgent = await ctx.db
        .query("agentSessions")
        .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
        .collect()

      for (const session of existingByAgent) {
        if (session.status === "connected" && session.sessionId !== args.sessionId) {
          await ctx.db.patch(session._id, {
            status: "disconnected",
            disconnectedAt: now,
          })
        }
      }
    }

    // Also clean up legacy sessions (no agentId) for this user that are stale.
    // These are from before the agentId feature was deployed.
    const LEGACY_STALE_MS = 5 * 60 * 1000 // 5 minutes
    const connectedForUser = await ctx.db
      .query("agentSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "connected"))
      .collect()

    for (const session of connectedForUser) {
      if (
        !session.agentId &&
        session.sessionId !== args.sessionId &&
        now - session.lastActivityAt > LEGACY_STALE_MS
      ) {
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
      agentId: args.agentId,
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
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "connected"))
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

/** Expire stale sessions (no activity for 30 minutes). Called by cron. */
export const expireStaleSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 60 * 1000
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

/** Delete old disconnected/expired sessions (older than 24 hours). Called by cron. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000

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
