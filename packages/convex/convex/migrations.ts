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
export {}
