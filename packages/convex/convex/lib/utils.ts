import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

/** Generate a prefixed config ID (e.g., "st_a1b2c3d4") */
export function generateConfigId(prefix: string): string {
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  return `${prefix}_${hex}`
}

/** Get current billing period string (e.g., "2026-02") */
export function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/** Increment a usage counter for the current period */
export async function incrementUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  field:
    | "taskCount"
    | "memoryCount"
    | "projectCount"
    | "issueCount"
    | "attachmentCount"
    | "apiCalls"
): Promise<void> {
  const period = getCurrentPeriod()

  const existing = await ctx.db
    .query("usage")
    .withIndex("by_user_period", (q) => q.eq("userId", userId).eq("period", period))
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, {
      [field]: (existing[field] ?? 0) + 1,
    })
  } else {
    await ctx.db.insert("usage", {
      userId,
      period,
      taskCount: field === "taskCount" ? 1 : 0,
      memoryCount: field === "memoryCount" ? 1 : 0,
      projectCount: field === "projectCount" ? 1 : 0,
      issueCount: field === "issueCount" ? 1 : 0,
      attachmentCount: field === "attachmentCount" ? 1 : 0,
      apiCalls: field === "apiCalls" ? 1 : 0,
    })
  }
}
