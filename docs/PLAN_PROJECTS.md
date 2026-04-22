# Plan: Projects inside Spaces (v0.1.0)

**Status:** Draft — awaiting sign-off
**Target version:** `0.1.0`
**Cutover marker:** Any `spaces` row created at or after v0.1.0 may contain projects. Pre-v0.1.0 spaces have no projects unless migrated.

---

## 1. Goal

Introduce a **project** concept nested *inside* a space. Projects are optional — tasks, issues, memories, and cycles can live directly on a space (as today) or within a project. Slugs become `{SPACE}-{PROJECT}-{N}` when a project is set.

```
user → space → project (optional) → tasks / issues / memories / cycles
```

---

## 2. Design decisions (locked in)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Project is **optional** | Space-level "Inbox" items remain valid |
| 2 | All child entities (tasks, issues, memories, cycles) gain optional `projectId` | Uniform model |
| 3 | Slug format: `{SPACE_SLUG}-{PROJECT_SLUG}-{N}` with project; `{SPACE_SLUG}-{N}` without | Linear-style nested identifier |
| 4 | Project slugs are unique **within a space** (not globally) | Less friction; matches mental model |
| 5 | `persona` and `estimateScale`: **live inherit + per-field override** (`project.X ?? space.X`) | Scalar fields — trivial merge |
| 6 | `statuses`, `labels`, `members`: **copy-on-create** snapshot from space, then independently editable | Array fields — simpler v1; projects drift from space over time (acceptable) |
| 7 | Memory scope bubbling: **broader includes narrower, narrower includes broader** | Searching in a project sees project + space + global memories; searching in a space sees space + all its projects + global |
| 8 | Cycles: `spaceId` required, `projectId` optional | Either level can run sprints |
| 9 | `sessions.activeProjectId` added; clears when space changes; setting a project auto-switches the space | Active-context in MCP |
| 10 | `spaceLinks` gains optional `projectId` | Path/repo can auto-resolve to both space and project |
| 11 | Existing space-level items stay at space level when a project is added later | No auto-migration; bulk-move is out-of-scope for v1 |
| 12 | Archive/delete is soft-only; never cascades | Deleting a project does **not** delete its tasks — they remain with `projectId` pointing at the (archived) project |
| 13 | MCP tools: 6 new project CRUD tools + optional `projectId` on every existing create/list tool + `link_project`/`unlink_project` | Full symmetry with spaces |
| 14 | `get_context` narrows to project by default when `activeProjectId` is set | Auto-focus when scoped |
| 15 | Drop the legacy `projects` drain table in the same release | Safe: prod has 3 legacy rows, all already mirrored into `spaces`; no active code reads from it |

---

## 3. Schema changes (`packages/convex/convex/schema.ts`)

### 3.1 Drop legacy drain (Deploy 2 of the Spaces migration)

- Remove legacy `projects` table entirely
- Remove every `projectId: v.optional(v.id("projects"))` field from `tasks`, `issues`, `memories`, `cycles`, `spaceLinks`, `sessions`, `attachments`, `comments`, `usage`
- Remove `users.settings.defaultProjectId`
- Remove all `by_user_project*` indexes

### 3.2 Add new `projects` table (nested under spaces)

```ts
projects: defineTable({
  userId: v.id("users"),
  spaceId: v.id("spaces"),  // REQUIRED — project always belongs to a space
  name: v.string(),
  slug: v.string(),          // unique within space
  description: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("paused"),
    v.literal("completed"),
    v.literal("archived")
  ),

  // Counters (per-project for contiguous numbering)
  taskCounter: v.optional(v.number()),
  issueCounter: v.optional(v.number()),

  // Config — copied from space at creation, then independently editable
  statuses: v.array(/* same shape as space.statuses */),
  labels: v.array(/* same shape */),
  members: v.array(/* same shape */),

  // Config — live inherit: undefined = use space's value
  estimateScale: v.optional(v.object({ type: ..., values: ... })),
  persona: v.optional(v.object({ systemPrompt: v.string() })),

  // Workspace linking (optional, project-level)
  linkedPaths: v.optional(v.array(v.string())),
  linkedRepos: v.optional(v.array(v.string())),

  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_space", ["spaceId"])
  .index("by_user_space", ["userId", "spaceId"])
  .index("by_user_space_status", ["userId", "spaceId", "status"])
  .index("by_space_slug", ["spaceId", "slug"])  // uniqueness check
```

### 3.3 Add `projectId` (new meaning) to child tables

On each of: `tasks`, `issues`, `memories`, `cycles`, `attachments`, `comments`:
```ts
projectId: v.optional(v.id("projects"))
```

Plus new compound indexes:
- `tasks.by_user_project_status`
- `tasks.by_user_space_project_status`
- `issues.by_user_project_status`
- `issues.by_user_space_project_status`
- `memories.by_user_project`
- `memories.by_user_space_project`
- `cycles.by_space_project_status`

Plus: extend the `memories.by_embedding` vector filterFields to include `projectId`.

### 3.4 `sessions`

```ts
activeSpaceId: v.optional(v.id("spaces")),
activeProjectId: v.optional(v.id("projects")),  // NEW — always has matching activeSpaceId
```

### 3.5 `spaceLinks` (currently embedded in spaces.linkedPaths/linkedRepos — no change needed there)

Decision: keep linkedPaths/linkedRepos on both `spaces` AND `projects`. Resolution order: try project match first, fall back to space match.

---

## 4. Convex function changes

### 4.1 New files

- `packages/convex/convex/projects.ts` — CRUD (create, list, get, update, archive, remove) + `linkProject`, `unlinkProject`, `resolveProjectByWorkspace`
- `packages/convex/convex/projectConfig.ts` — mirror of `spaceConfig.ts`: updateStatuses, addLabel, updateLabel, removeLabel, addMember, removeMember, updateMember, updateEstimateScale, updatePersona, updateMemorySettings

### 4.2 Modified files

**`tasks.ts`, `issues.ts`**
- Accept optional `projectId` on create/update/list
- When `projectId` set on create: validate project belongs to user + space, use project's counter, format slug as `{SPACE}-{PROJECT}-{N}`
- When `projectId` unset: use space counter, slug `{SPACE}-{N}` (unchanged)
- `list`: add project filter; scope filter semantics: `projectOnly`, `spaceOnly` (exclude projects), `includeProjects` (both)

**`memories.ts`**
- Accept optional `projectId` on add/update
- `search` and `listMemories`: implement **bubble-up rules**:
  - Project scope (`projectId` set): returns memories where `(spaceId=S AND projectId=P) OR (spaceId=S AND projectId=undefined) OR (spaceId=undefined AND projectId=undefined)`
  - Space scope (`spaceId` set, no projectId): returns memories where `spaceId=S OR (spaceId=undefined AND projectId=undefined)` (includes *all* projects in that space)
  - Global (`globalOnly`): returns memories where `spaceId=undefined AND projectId=undefined`
- `hybridSearch`: same bubble-up logic in the post-fetch filter phase

**`cycles.ts`**
- Accept optional `projectId` on create/update
- `list`: filter by projectId or space-wide

**`spaces.getContext`**
- If `activeProjectId` is set on the session, narrow everything (pending tasks, in-progress tasks, recent memories, cycle, config) to that project
- Response adds `activeProject`, `projects: [...]` (list of projects in active space), `configSource: "space" | "project"` for each config block so clients can show inherited state
- Memory load uses bubble-up rules (project scope by default when active project set)

**`sessions.ts`**
- Replace `setActiveSpace` with `setActiveScope({ spaceId?, projectId? })`:
  - Setting projectId requires spaceId (or auto-resolves space from project)
  - Setting spaceId alone clears projectId
  - Both undefined clears both

**`users.ts`**
- Remove `setDefaultProject` (already done)
- Add `setDefaultProject` (new meaning: project inside current default space)
- Remove `settings.defaultProjectId` (legacy), add new `settings.defaultProjectId` (new meaning)

---

## 5. Shared types (`packages/shared/src/types.ts`)

Add `Project` interface. Extend existing interfaces:
- `Task`, `Issue`, `Memory`, `Cycle`: add `projectId?: string`
- `Session`: add `activeProjectId?: string`
- `GetContextResponse`: add `activeProject`, `projects`, `configSource`

Plus:
- `User.settings.defaultProjectId?: string`

---

## 6. MCP tool changes (`packages/mcp-server/src/tools/`)

### 6.1 New tools (8 total)

**Projects CRUD:**
1. `create_project` — args: spaceId (optional, defaults to active), name, description, slug (optional, auto-generated from name)
2. `list_projects` — args: spaceId, status
3. `get_project` — args: id or slug
4. `update_project` — args: id, name?, description?, status?
5. `archive_project` — args: id
6. `set_active_project` — args: id (or null to clear)

**Linking:**
7. `link_project` — args: id, paths?, repos?
8. `unlink_project` — args: id, paths?, repos?

### 6.2 Modified existing tools

Every create/list/update tool for tasks, issues, memories, cycles gains optional `projectId`.

`get_context` response includes:
```jsonc
{
  "activeSpace": { ... },
  "activeProject": { ... } | null,
  "projects": [ ... ],          // all projects in active space
  "taskSummary": { ... },       // narrowed to project if active
  "configSource": {             // NEW: tells client where each config came from
    "statuses": "project" | "space",
    "labels": "project" | "space",
    "persona": "project" | "space" | null
  }
}
```

### 6.3 Setup instructions

`get_setup_instructions` accepts optional `projectId`. When set, CLAUDE.md snippet includes active project name/slug/id and instructs the agent to use `projectId` on all task/issue/memory operations.

---

## 7. Web dashboard changes (`apps/web/src/`)

### Pages
- `app/(dashboard)/dashboard/spaces/[id]/projects/page.tsx` — project list
- `app/(dashboard)/dashboard/spaces/[id]/projects/[projectId]/page.tsx` — project detail (tasks/issues/memories filtered to project)
- `app/(dashboard)/dashboard/spaces/[id]/projects/[projectId]/settings/page.tsx` — project settings (shows inherited vs overridden fields)

### Components
- `dashboard/project-picker.tsx` — next to space-picker in header; disabled until a space is selected
- `dashboard/project-header.tsx` — mirror of space-header
- `dashboard/settings/inherited-field.tsx` — shared component showing "inherited from space" vs "overridden" state for persona + estimateScale
- Update `item-detail-view`, `task-list`, `issue-list`, `memory-list` to show project badge when projectId set

### Copy changes (marketing)
- features.tsx: mention projects-in-spaces nesting
- pricing.tsx: clarify project counts by plan tier (free = 1 space, 1 project; pro = unlimited; etc.)
- tool-showcase.tsx: add Projects category with new tools
- email.ts welcome email: "Create a space, then optionally organize with projects"

---

## 8. Plan tier limits (`packages/shared/src/constants.ts`)

**Confirmed:**
| Plan | Spaces | Projects per space |
|---|---|---|
| free | 1 | 3 |
| pro | 3 | 10 |
| team | 5 | 10 |
| enterprise | unlimited | unlimited |

**Changes required:**
- `PlanTier` type in `packages/shared/src/types.ts` — add `"enterprise"`
- `users.plan` field in schema.ts — add `v.literal("enterprise")`
- `PLAN_LIMITS` in constants.ts — add `projectsPerSpace` key across all tiers and tighten current `team` spaces cap from Infinity to 5
- `RATE_LIMITS` — add enterprise tier (propose 10000/min)
- Stripe products — add an Enterprise tier SKU (deferred; not in scope for this v0.1.0 commit unless billing is being wired up simultaneously)

---

## 9. Migration strategy

### 9.1 Production data impact (verified 2026-04-22)

- 5 users; `tim@do.dev` is the only one with activity
- Legacy `projects` table: 3 rows (DODEV, JUBAL, DO), all mirrored into `spaces` already
- No child table rows reference the legacy `projects` table IDs meaningfully (all current tasks/issues/memories are space-scoped)
- Nothing created in the last 30 days

**Conclusion: dropping the legacy `projects` table is safe with no data loss.**

### 9.2 Rollout order (single deploy)

1. Merge schema change that drops legacy `projects` table and its index/field references, and adds new `projects` table + child `projectId` fields
2. Deploy Convex — this drops the legacy table; Convex will complain if any document still references it, so step 1 includes clearing orphan `projectId` values via a one-shot migration (`migrations.cleanupLegacyProjectIds`) run before schema push
3. Deploy web app with new dashboard
4. Publish `@dodev/mcp-server@0.1.0` to npm
5. Update docs

### 9.3 Migration helper

`migrations.cleanupLegacyProjectIds` internalMutation:
- For every row in `tasks`, `issues`, `memories`, `cycles`, `attachments`, `comments`, `sessions`, `usage` with a legacy `projectId`, unset it
- For `users`, unset `settings.defaultProjectId`

---

## 10. Documentation updates

Must be updated before or with the code merge:

- `CLAUDE.md` (root) — version → 0.1.0, document project hierarchy, slug format, memory bubbling
- `docs/CONVEX_SCHEMA.md` — new table, new fields, bubble-up rules, config inheritance/override table
- `docs/MCP_TOOLS.md` — 8 new tools, optional `projectId` on existing ones, new `get_context` shape
- `docs/MEMORY.md` — add section on project-scope memories and bubble-up
- `README.md` — high-level: "Projects inside spaces"
- `docs/PLAN_PROJECTS.md` (this file) — move to `docs/architecture/` after ship, mark Implemented

---

## 11. Version plan

- Pre-change: `0.0.8`
- Target: `0.1.0`
- Bump in:
  - Root `package.json`
  - `apps/web/package.json`
  - `packages/convex/package.json`
  - `packages/mcp-server/package.json`
  - `packages/shared/package.json`
- Schema header comment: `Projects introduced in v0.1.0 (2026-04-22).`
- npm publish: `@dodev/mcp-server@0.1.0`

---

## 12. Decisions (all resolved)

1. **Plan tier limits** — free 1×3, pro 3×10, team 5×10, enterprise unlimited (see §8)
2. **Slug collision** — auto-suffix (`-2`, `-3`, …) when user-provided or auto-generated slug collides with existing project in the same space
3. **Cross-space project move** — **not supported in v1.** A project belongs to one space for its lifetime. Users who need to move must export and recreate.
4. **Webhooks / events** — none planned for v1

---

## 13. Work breakdown (estimated)

| Phase | Files touched | Complexity |
|---|---|---|
| 1. Schema + migration helper | 2 | Low |
| 2. Convex functions (new + modified) | ~12 | High — bubble-up logic in memories is the trickiest piece |
| 3. Shared types | 1 | Low |
| 4. MCP server tools | ~8 | Medium |
| 5. Web dashboard | ~15 | Medium |
| 6. Docs + marketing copy | ~8 | Low |
| 7. Testing (self-hosted, stdio, HTTP flows) | — | Medium |

Suggested commit structure: one PR per phase, ordered 1 → 7. Or if shipping hot: one feature branch, one large commit per phase on that branch, merged as a single PR.

---

## 14. Acceptance criteria

- [ ] `create_project` creates a project inside the active space
- [ ] `create_task` with `projectId` generates slug `{SPACE}-{PROJECT}-{N}` using per-project counter
- [ ] `create_task` without `projectId` still generates `{SPACE}-{N}` using space counter
- [ ] `get_context` with active project returns project-narrowed data with `configSource` breakdown
- [ ] Memory search from project scope returns project + space + global memories
- [ ] Editing space's statuses does NOT affect project's statuses (copy-on-create behaviour)
- [ ] Editing space's persona DOES affect projects with null persona (live inherit behaviour)
- [ ] Workspace path linked to a project auto-resolves both space and project in `get_context`
- [ ] Archiving a space does not delete its projects' data (soft archive only)
- [ ] `@dodev/mcp-server@0.1.0` published to npm
- [ ] All docs in section 10 updated
- [ ] `pnpm typecheck` green, `pnpm check` no new errors
