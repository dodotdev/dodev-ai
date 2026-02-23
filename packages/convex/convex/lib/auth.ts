import { ConvexError } from "convex/values"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { getCurrentPeriod } from "./utils"

/**
 * Validates an API key hash and returns the user.
 * Used by all MCP tool handlers.
 */
export async function authenticateApiKey(
  ctx: QueryCtx | MutationCtx,
  apiKeyHash: string
): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_api_key_hash", (q) => q.eq("apiKeyHash", apiKeyHash))
    .unique()

  if (!user) {
    throw new ConvexError("UNAUTHORIZED")
  }
  return user
}

/**
 * Checks plan quotas before creating resources.
 * Free plan: 1 project, 100 todos, 50 memories.
 * Paid plans: unlimited.
 */
export async function checkQuota(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  resource: "todos" | "memories" | "projects" | "issues"
): Promise<void> {
  if (user.plan !== "free") return

  const limits = { todos: 100, memories: 50, projects: 1, issues: 200 }
  const period = getCurrentPeriod()

  const usage = await ctx.db
    .query("usage")
    .withIndex("by_user_period", (q) => q.eq("userId", user._id).eq("period", period))
    .unique()

  const countField = `${resource}Count` as "todoCount" | "memoryCount" | "projectCount" | "issueCount"
  const count = usage?.[countField] ?? 0
  if (count >= limits[resource]) {
    throw new ConvexError("QUOTA_EXCEEDED")
  }
}
