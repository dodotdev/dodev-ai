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
      // Skip projects with missing fields (cleared during migration)
      if (!project.userId) continue

      // Gather all tasks and issues for this project
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", project.userId!).eq("projectId", project._id)
        )
        .collect()

      const issues = await ctx.db
        .query("issues")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", project.userId!).eq("projectId", project._id)
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
        slug: project.slug ?? project.name ?? "unknown",
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

/**
 * Migrate all projects to the new spaces table, then update every child record
 * (tasks, issues, memories, cycles, versions, attachments, comments),
 * sessions, and user settings to reference the new spaceId.
 *
 * This is a one-shot migration for the projects -> spaces rename (Deploy 1).
 * It is idempotent in that it skips projects without a userId/name (already cleared).
 *
 * Run via: npx convex run --component convex migrations:migrateProjectsToSpaces
 */
export const migrateProjectsToSpaces = internalMutation({
  args: {},
  handler: async (ctx) => {
    // -------------------------------------------------------------------------
    // 1. Copy all projects to spaces
    // -------------------------------------------------------------------------
    const projects = await ctx.db.query("projects").collect()
    const idMap = new Map<string, Id<"spaces">>() // old projectId -> new spaceId

    for (const project of projects) {
      // Skip if project fields are empty (already cleared or invalid)
      if (!project.userId || !project.name) continue

      const newId = await ctx.db.insert("spaces", {
        userId: project.userId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        status: project.status ?? "active",
        itemCounter: project.itemCounter,
        taskCounter: project.taskCounter,
        issueCounter: project.issueCounter,
        metadata: project.metadata,
        statuses: project.statuses ?? [],
        labels: project.labels ?? [],
        members: project.members ?? [],
        estimateScale: project.estimateScale ?? {
          type: "points" as const,
          values: ["1", "2", "3", "5", "8", "13", "21"],
        },
        persona: project.persona,
        linkedPaths: project.linkedPaths,
        linkedRepos: project.linkedRepos,
        memorySettings: project.memorySettings,
        createdAt: project.createdAt ?? Date.now(),
        updatedAt: project.updatedAt ?? Date.now(),
      })
      idMap.set(project._id, newId)
    }

    // -------------------------------------------------------------------------
    // 2. Update child records — tasks
    // -------------------------------------------------------------------------
    let tasksUpdated = 0
    const allTasks = await ctx.db.query("tasks").collect()
    for (const task of allTasks) {
      if (task.projectId && idMap.has(task.projectId)) {
        await ctx.db.patch(task._id, {
          spaceId: idMap.get(task.projectId)!,
        })
        tasksUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 3. Update child records — issues
    // -------------------------------------------------------------------------
    let issuesUpdated = 0
    const allIssues = await ctx.db.query("issues").collect()
    for (const issue of allIssues) {
      if (issue.projectId && idMap.has(issue.projectId)) {
        await ctx.db.patch(issue._id, {
          spaceId: idMap.get(issue.projectId)!,
        })
        issuesUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 4. Update child records — memories
    // -------------------------------------------------------------------------
    let memoriesUpdated = 0
    const allMemories = await ctx.db.query("memories").collect()
    for (const memory of allMemories) {
      if (memory.projectId && idMap.has(memory.projectId)) {
        await ctx.db.patch(memory._id, {
          spaceId: idMap.get(memory.projectId)!,
        })
        memoriesUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 5. Update child records — cycles
    // -------------------------------------------------------------------------
    let cyclesUpdated = 0
    const allCycles = await ctx.db.query("cycles").collect()
    for (const cycle of allCycles) {
      if (cycle.projectId && idMap.has(cycle.projectId)) {
        await ctx.db.patch(cycle._id, {
          spaceId: idMap.get(cycle.projectId)!,
        })
        cyclesUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 6. Update child records — versions
    // -------------------------------------------------------------------------
    let versionsUpdated = 0
    const allVersions = await ctx.db.query("versions").collect()
    for (const version of allVersions) {
      if (version.projectId && idMap.has(version.projectId)) {
        await ctx.db.patch(version._id, {
          spaceId: idMap.get(version.projectId)!,
        })
        versionsUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 7. Update child records — attachments
    // -------------------------------------------------------------------------
    let attachmentsUpdated = 0
    const allAttachments = await ctx.db.query("attachments").collect()
    for (const attachment of allAttachments) {
      if (attachment.projectId && idMap.has(attachment.projectId)) {
        await ctx.db.patch(attachment._id, {
          spaceId: idMap.get(attachment.projectId)!,
        })
        attachmentsUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 8. Update child records — comments
    // -------------------------------------------------------------------------
    let commentsUpdated = 0
    const allComments = await ctx.db.query("comments").collect()
    for (const comment of allComments) {
      if (comment.projectId && idMap.has(comment.projectId)) {
        await ctx.db.patch(comment._id, {
          spaceId: idMap.get(comment.projectId)!,
        })
        commentsUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 9. Update sessions — activeSpaceId from activeProjectId
    // -------------------------------------------------------------------------
    let sessionsUpdated = 0
    const allSessions = await ctx.db.query("sessions").collect()
    for (const session of allSessions) {
      if (session.activeProjectId && idMap.has(session.activeProjectId)) {
        await ctx.db.patch(session._id, {
          activeSpaceId: idMap.get(session.activeProjectId)!,
        })
        sessionsUpdated++
      }
    }

    // -------------------------------------------------------------------------
    // 10. Update user settings — defaultSpaceId from defaultProjectId
    // -------------------------------------------------------------------------
    let usersUpdated = 0
    const allUsers = await ctx.db.query("users").collect()
    for (const user of allUsers) {
      if (user.settings?.defaultProjectId && idMap.has(user.settings.defaultProjectId)) {
        await ctx.db.patch(user._id, {
          settings: {
            ...user.settings,
            defaultSpaceId: idMap.get(user.settings.defaultProjectId)!,
          },
        })
        usersUpdated++
      }
    }

    return {
      projectsCopied: idMap.size,
      tasksUpdated,
      issuesUpdated,
      memoriesUpdated,
      cyclesUpdated,
      versionsUpdated,
      attachmentsUpdated,
      commentsUpdated,
      sessionsUpdated,
      usersUpdated,
    }
  },
})
