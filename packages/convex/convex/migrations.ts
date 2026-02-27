import type { Id } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"

/**
 * Renumber all tasks and issues per project using a single shared counter.
 * Items are sorted by creation date and numbered sequentially.
 * After renumbering, the project's itemCounter is set to the final count.
 *
 * This ensures no duplicate slugs (e.g. DODEV-1) across item types.
 * The shared counter approach supports future item types (docs, etc.)
 * without needing separate counters per type.
 *
 * Run via: npx convex run --component convex migrations:renumberItems
 */
export const renumberItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect()
    const results: { projectId: string; slug: string; itemsRenumbered: number }[] = []

    for (const project of projects) {
      // Gather all tasks and issues for this project
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", project.userId).eq("projectId", project._id)
        )
        .collect()

      const issues = await ctx.db
        .query("issues")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", project.userId).eq("projectId", project._id)
        )
        .collect()

      // Merge and sort by creation date
      const allItems: {
        table: "tasks" | "issues"
        id: Id<"tasks"> | Id<"issues">
        createdAt: number
      }[] = [
        ...tasks.map((t) => ({ table: "tasks" as const, id: t._id, createdAt: t.createdAt })),
        ...issues.map((i) => ({ table: "issues" as const, id: i._id, createdAt: i.createdAt })),
      ].sort((a, b) => a.createdAt - b.createdAt)

      // Renumber sequentially
      let counter = 0
      for (const item of allItems) {
        counter++
        if (item.table === "tasks") {
          await ctx.db.patch(item.id as Id<"tasks">, { number: counter })
        } else {
          await ctx.db.patch(item.id as Id<"issues">, { number: counter })
        }
      }

      // Update the project's shared counter
      await ctx.db.patch(project._id, { itemCounter: counter })

      results.push({
        projectId: project._id,
        slug: project.slug ?? project.name,
        itemsRenumbered: counter,
      })
    }

    // Handle unscoped items (no projectId) — grouped by userId
    const allTasks = await ctx.db.query("tasks").collect()
    const allIssues = await ctx.db.query("issues").collect()

    const userUnscopedItems = new Map<
      string,
      { table: "tasks" | "issues"; id: Id<"tasks"> | Id<"issues">; createdAt: number }[]
    >()

    for (const t of allTasks) {
      if (t.projectId) continue
      const list = userUnscopedItems.get(t.userId) ?? []
      list.push({ table: "tasks", id: t._id, createdAt: t.createdAt })
      userUnscopedItems.set(t.userId, list)
    }

    for (const i of allIssues) {
      if (i.projectId) continue
      const list = userUnscopedItems.get(i.userId) ?? []
      list.push({ table: "issues", id: i._id, createdAt: i.createdAt })
      userUnscopedItems.set(i.userId, list)
    }

    for (const [userId, items] of userUnscopedItems) {
      items.sort((a, b) => a.createdAt - b.createdAt)
      let counter = 0
      for (const item of items) {
        counter++
        if (item.table === "tasks") {
          await ctx.db.patch(item.id as Id<"tasks">, { number: counter })
        } else {
          await ctx.db.patch(item.id as Id<"issues">, { number: counter })
        }
      }
      await ctx.db.patch(userId as Id<"users">, { itemCounter: counter })
    }

    return { projects: results, unscopedUsers: userUnscopedItems.size }
  },
})
