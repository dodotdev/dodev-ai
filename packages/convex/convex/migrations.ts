import { internalMutation } from "./_generated/server"
import { generateConfigId } from "./lib/utils"

/**
 * Data migrations for dodev.ai.
 *
 * Historical migrations that have already been run against both dev
 * (notable-gazelle-779) and prod (proficient-buzzard-939) are removed
 * after their target fields become schema-enforced or get repurposed.
 *
 * Removed migrations:
 *   - `renumberItems` — renumbered items under legacy projects table
 *   - `migrateProjectsToSpaces` — copied legacy projects to new spaces
 *   - `purgeLegacyProjects` — cleared legacy projectId refs; unsafe to
 *     run after v0.1.0 because `projectId` is now a legitimate field
 *     pointing at the new nested-project entity.
 */

const DEFAULT_LABELS = [
  { name: "bug", color: "#ef4444" },
  { name: "feature", color: "#10b981" },
  { name: "improvement", color: "#3b82f6" },
  { name: "tech-debt", color: "#f59e0b" },
  { name: "urgent", color: "#ec4899" },
  { name: "question", color: "#8b5cf6" },
]

/**
 * Backfill the default label set on spaces (and projects) whose `labels`
 * array is empty. New spaces created after v0.1.1 get these labels at
 * creation time — this migration only patches records that predate the
 * change. Run once per deployment.
 *
 * Run via:
 *   npx convex run --component convex migrations:backfillDefaultLabels
 *
 * Idempotent: only touches rows with `labels.length === 0`; re-runs are
 * no-ops.
 */
export const backfillDefaultLabels = internalMutation({
  args: {},
  handler: async (ctx) => {
    let spacesPatched = 0
    let projectsPatched = 0

    const spaces = await ctx.db.query("spaces").collect()
    for (const space of spaces) {
      if (space.labels.length === 0) {
        await ctx.db.patch(space._id, {
          labels: DEFAULT_LABELS.map((l) => ({
            id: generateConfigId("lb"),
            name: l.name,
            color: l.color,
          })),
          updatedAt: Date.now(),
        })
        spacesPatched++
      }
    }

    const projects = await ctx.db.query("projects").collect()
    for (const project of projects) {
      if (project.labels.length === 0) {
        await ctx.db.patch(project._id, {
          labels: DEFAULT_LABELS.map((l) => ({
            id: generateConfigId("lb"),
            name: l.name,
            color: l.color,
          })),
          updatedAt: Date.now(),
        })
        projectsPatched++
      }
    }

    return { spacesPatched, projectsPatched }
  },
})
