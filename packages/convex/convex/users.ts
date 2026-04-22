import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"

export const createFromApiKey = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    apiKey: v.string(),
    apiKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Upsert: if user with this workosUserId exists, update their API key
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        apiKeyHash: args.apiKeyHash,
        updatedAt: now,
      })
      return await ctx.db.get(existing._id)
    }

    const id = await ctx.db.insert("users", {
      workosUserId: args.workosUserId,
      email: args.email,
      name: args.name,
      apiKey: args.apiKey,
      apiKeyHash: args.apiKeyHash,
      role: "approved",
      plan: "free",
      settings: {},
      createdAt: now,
      updatedAt: now,
    })
    return await ctx.db.get(id)
  },
})

export const getByApiKeyHash = query({
  args: {
    apiKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_api_key_hash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .unique()
  },
})

export const getByWorkosId = query({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .unique()
  },
})

export const createOrUpdateFromWorkOS = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
        updatedAt: Date.now(),
      })
      return await ctx.db.get(existing._id)
    }

    // Generate API key for new user
    const keyBytes = new Uint8Array(32)
    crypto.getRandomValues(keyBytes)
    const apiKey =
      "dodev_sk_" +
      Array.from(keyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)

    // Hash the API key
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey))
    const apiKeyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const now = Date.now()
    const id = await ctx.db.insert("users", {
      workosUserId: args.workosUserId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      apiKey,
      apiKeyHash,
      role: "waitlisted",
      plan: "free",
      settings: {},
      createdAt: now,
      updatedAt: now,
    })
    return await ctx.db.get(id)
  },
})

export const createSelfHostedUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if self-hosted user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", "self-hosted"))
      .unique()
    if (existing) return existing

    // Generate an API key for MCP server use
    const keyBytes = new Uint8Array(32)
    crypto.getRandomValues(keyBytes)
    const apiKey =
      "dodev_sk_" +
      Array.from(keyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)

    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey))
    const apiKeyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const now = Date.now()
    const id = await ctx.db.insert("users", {
      workosUserId: "self-hosted",
      email: "local@self-hosted",
      name: "Local User",
      apiKey,
      apiKeyHash,
      role: "approved",
      plan: "free",
      settings: {},
      createdAt: now,
      updatedAt: now,
    })
    return await ctx.db.get(id)
  },
})

export const markWelcomeEmailSent = mutation({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .unique()

    if (!user) return

    await ctx.db.patch(user._id, {
      welcomeEmailSentAt: Date.now(),
    })
  },
})

export const markWaitlistEmailSent = mutation({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .unique()

    if (!user) return

    await ctx.db.patch(user._id, {
      waitlistEmailSentAt: Date.now(),
    })
  },
})

export const regenerateApiKey = mutation({
  args: {
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .unique()

    if (!user) {
      throw new Error("User not found")
    }

    const keyBytes = new Uint8Array(32)
    crypto.getRandomValues(keyBytes)
    const apiKey =
      "dodev_sk_" +
      Array.from(keyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)

    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey))
    const apiKeyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    await ctx.db.patch(user._id, {
      apiKey,
      apiKeyHash,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(user._id)
  },
})

export const setDefaultSpace = mutation({
  args: {
    apiKeyHash: v.string(),
    spaceId: v.id("spaces"),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    await ctx.db.patch(user._id, {
      settings: {
        ...user.settings,
        defaultSpaceId: args.spaceId,
      },
      updatedAt: Date.now(),
    })
    return await ctx.db.get(user._id)
  },
})

export const adminDeleteByWorkosId = mutation({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first()
    if (user) {
      await ctx.db.delete(user._id)
      return { deleted: true, id: user._id }
    }
    return { deleted: false }
  },
})
