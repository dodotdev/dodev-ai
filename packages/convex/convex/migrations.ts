import { internalMutation } from "./_generated/server"
import { generateConfigId } from "./lib/utils"

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

/** Derive a slug from a project name */
function deriveSlug(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 5)
  }
  return words[0].toUpperCase().slice(0, 5)
}

/** Backfill existing projects with default config fields, slug, and todoCounter */
export const backfillProjectConfig = internalMutation({
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect()
    let updated = 0

    // Track used slugs per user for uniqueness
    const usedSlugs = new Map<string, Set<string>>()

    for (const project of projects) {
      const raw = project as Record<string, unknown>
      const patches: Record<string, unknown> = {}

      if (!raw.statuses || !raw.labels || !raw.members || !raw.estimateScale) {
        patches.statuses = DEFAULT_STATUSES.map((s) => ({
          ...s,
          id: generateConfigId("st"),
        }))
        patches.labels = []
        patches.members = []
        patches.estimateScale = DEFAULT_ESTIMATE_SCALE
      }

      if (!raw.slug) {
        const userId = String(project.userId)
        if (!usedSlugs.has(userId)) usedSlugs.set(userId, new Set())
        const userSlugs = usedSlugs.get(userId)!

        const slug = deriveSlug(project.name).replace(/[^A-Z0-9]/g, "") || "PRJ"
        let candidate = slug
        let suffix = 1
        while (userSlugs.has(candidate)) {
          candidate = `${slug}${suffix}`
          suffix++
        }
        userSlugs.add(candidate)
        patches.slug = candidate
      }

      if (raw.todoCounter === undefined) {
        // Count existing todos for this project to set the counter
        const todos = await ctx.db
          .query("todos")
          .withIndex("by_user_project", (q) =>
            q.eq("userId", project.userId).eq("projectId", project._id)
          )
          .collect()
        patches.todoCounter = todos.length
      }

      if (Object.keys(patches).length > 0) {
        patches.updatedAt = Date.now()
        await ctx.db.patch(project._id, patches)
        updated++
      }
    }

    return { updated, total: projects.length }
  },
})

/** Rename the `stub` field to `slug` on all existing projects */
export const renameStubToSlug = internalMutation({
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect()
    let updated = 0

    for (const project of projects) {
      const raw = project as Record<string, unknown>
      // If document has `stub` but no `slug`, copy it over
      if (raw.stub && !raw.slug) {
        await ctx.db.patch(project._id, {
          slug: raw.stub as string,
          updatedAt: Date.now(),
        })
        updated++
      }
    }

    return { updated, total: projects.length }
  },
})

/** Rename the DoMCP project to dodev */
export const renameDoMCPToDodev = internalMutation({
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect()
    const results = []

    for (const project of projects) {
      if (project.name === "DoMCP") {
        await ctx.db.patch(project._id, {
          name: "dodev",
          slug: "DODEV",
          updatedAt: Date.now(),
        })
        results.push({ id: project._id, from: "DoMCP/DOMCP", to: "dodev/DODEV" })
      }
    }

    return { renamed: results.length, results }
  },
})
