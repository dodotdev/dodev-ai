import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"

/** Look up an OAuth client by its client_id */
export const get = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthClients")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique()
  },
})

/** Register a new OAuth client (called during dynamic client registration) */
export const register = mutation({
  args: {
    clientId: v.string(),
    clientData: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthClients", {
      clientId: args.clientId,
      clientData: args.clientData,
      createdAt: Date.now(),
    })
  },
})

/** Clean up OAuth client registrations older than 60 days */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000
    const old = await ctx.db
      .query("oauthClients")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(500)

    let deleted = 0
    for (const client of old) {
      await ctx.db.delete(client._id)
      deleted++
    }
    return { deleted }
  },
})
