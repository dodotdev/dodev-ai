import { v } from "convex/values"
import { query } from "./_generated/server"
import { authenticateApiKey } from "./lib/auth"
import { getCurrentPeriod } from "./lib/utils"

export const getCurrentUsage = query({
  args: {
    apiKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateApiKey(ctx, args.apiKeyHash)
    const period = getCurrentPeriod()

    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_period", (q) => q.eq("userId", user._id).eq("period", period))
      .unique()

    if (!usage) {
      return {
        userId: user._id,
        period,
        taskCount: 0,
        memoryCount: 0,
        projectCount: 0,
        issueCount: 0,
        apiCalls: 0,
      }
    }

    return usage
  },
})
