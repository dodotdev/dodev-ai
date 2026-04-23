# PRD: dodev.ai Desktop

**Status:** Draft
**Author:** Tim + Claude
**Target:** v0.2.0 series
**Last updated:** 2026-04-23

---

## 1. One-liner

> **dodev.ai Desktop is the review layer between your AI agents and your roadmap** — a native app that hosts the MCP server locally, watches your repos, runs a project-scoped supervisor agent, and uses AI to help you write, refine, and triage every task, issue, and memory the tool touches.

---

## 2. Why this exists

Three problems we're solving at once:

1. **Setup friction** of self-hosted MCP (Docker / npx / env wiring) gates too many users. A desktop app that ships the MCP server makes installation a double-click.
2. **Humans are the chokepoint** in an agent-driven workflow. Agents file tasks, update statuses, and propose memories faster than any person can review them. The UI needs to be a review queue, not a data-entry form.
3. **PM tools don't understand what agents did.** Linear shows a status; it doesn't know the agent wrote three files, opened a PR, and ran the test suite. We own the MCP call graph — we should surface it.

The desktop app adds three things the web app structurally cannot:

- **Filesystem truth.** Read the linked repo. Diff HEAD against a task's definition-of-done. Watch commits and agent chat transcripts in real time.
- **Process integration.** Global hotkey, menubar, OS notifications, Keychain secrets, local MCP subprocess — all the nice-to-haves that make a dev tool feel native.
- **Ambient awareness.** Observe without being asked. Propose memories on commit. Flag status drift ("marked Done but PR still open").

---

## 3. Non-goals (for v1)

- Not a general-purpose coding chat — Cursor / Claude Code / Windsurf already own that surface. The desktop agent is a **PM supervisor**, not a coder.
- Not a Linear roadmap/Gantt clone. Humans doing long-range PM is not our target motion.
- No mobile app. Our user is at a desk.
- No time tracking.
- No bundled model credits at launch (BYO API key only).

---

## 4. Target user

**The indie or small-team developer running AI agents.** Has at least one of: Claude Code, Cursor, Windsurf, Aider, or similar. Already uses dodev.ai via the MCP server or wants to start. Mac first (the target user skews heavily Mac); Windows second; Linux third.

Not in scope for v1: enterprise, non-technical PMs, teams of >10.

---

## 5. Product pillars

Six pillars. All six compound. If you ship only 3, ship **Review Queue, Supervisor Chat, and AI-Assisted Authoring** — that's the viable MVP.

### 5.1 Review Queue (*primary surface*)

A top-level view, replacing Overview as the default landing page. Shows a stream of *proposed* artifacts waiting on human judgment:

- Tasks proposed by agents (extracted from commits, PR descriptions, Slack mentions, chat sessions)
- Memories captured ambiently (more in §5.5)
- Status transitions suggested by the agent/the DoD verifier
- Decisions inferred from PR merges ("we chose SQLite over Postgres on this PR — worth saving?")

Each item has:
- **Provenance**: which agent, which trigger (commit hash, file path, MCP tool call), what confidence
- **One-click approve, edit-then-approve, reject-with-reason**
- **Keyboard-driven** — every action has a hotkey (`j`/`k` navigate, `a` approve, `e` edit, `x` reject, `/` focus search)

Bulk operations: select a range, approve all, or apply the same edit.

Rejected items record the reason as a new memory ("Tim rejected because we don't use X pattern") — the rejection *teaches*.

**Schema**: existing tables gain a `proposed` state alongside active/completed/cancelled. New fields: `proposedBy` (agent id / source), `proposedAt`, `proposalSource` (commit sha, pr url, message id, tool call id), `proposalReason` (optional rationale from the agent).

### 5.2 Supervisor Chat (*Jubal-style, scoped to the active space/project*)

A persistent chat, one per space/project, that:

- Knows the active scope's `persona` as its system prompt
- Has MCP-tool access — can create tasks, move statuses, search memories, bulk-triage the review queue
- Loads context at session start via `get_context` (pending tasks, recent memories, active cycle)
- Never coldstarts — the thread is persistent; reopening the app continues where you left off
- Multi-agent capable: you can address a specific project persona ("DODEV-API, draft a migration plan") and the chat dispatches a scoped subordinate
- First-message-of-the-morning digest: "Here's what agents did overnight, here's what's pending your review"

This is *the* place you do triage, planning, and multi-step operations. Not coding — never coding. The IDE agent does that.

BYO API key (Anthropic / OpenAI / local via Ollama). Keys stored in the OS keychain. No bundled credits in v1.

### 5.3 AI-Assisted Authoring *(the Jubal angle — NEW)*

This is the gap in the v0.1.x thinking. AI isn't just "a client of the tool via MCP" and "a chat you talk to." It should be baked into **every single authoring surface** in the product. The typing experience itself gets smarter.

**Task / Issue / Memory creation**

- **Draft-to-crisp**: user types "fix the export timeout thing" → an inline AI step expands to title, description, acceptance criteria, suggested labels, suggested linked memories, suggested project tag. User reviews in the same dialog and hits create. No context switch.
- **Duplicate detection**: as you type the title, real-time semantic search surfaces existing open tasks/issues that might be the same thing. One-click "merge" or "dismiss."
- **Auto-classification**: type (bug/feature/improvement), severity (for issues), priority suggestion, with a one-line rationale. User can accept or adjust.
- **Definition-of-done suggestion**: for tasks with enough detail, AI proposes a DoD spec (tests, files, PR merge) the user can tune.
- **Break-down-into-subtasks**: a button on any task — "propose 3–5 subtasks." User reviews and accepts individual ones.

**Persona authoring**

- The AI Persona field on a space is a free-text system prompt. Today users stare at a blank textarea. Replace with a guided authoring flow: AI asks 4–5 questions (tech stack, code style preferences, review norms, tone) → generates a persona → user edits.
- Persona regenerator: "my persona feels stale" → AI reads your last 30 days of memories/decisions and proposes an updated persona.

**Memory enhancement**

- On `add_memory`, an AI step suggests: better tags, a crisper summary, a more informative title if the content is long, and links to related memories (semantic similarity).
- "Memory review" mode: batch-review memories the AI flags as stale, redundant, or contradicted by newer evidence.

**Prompt authoring for agents**

- The Jubal-style angle specifically: when you want to hand a task to an agent, there's a "Compose agent prompt" button that builds the full context (task + relevant memories + persona + DoD) as a prompt you can copy into Claude Code / Cursor, or dispatch directly from the supervisor chat.
- The prompt is editable before send. It learns from past prompts that led to successful task completions.

**Search**

- Natural-language search across tasks/issues/memories ("what did we decide about auth last month?") — hybrid keyword + semantic. Already half-built in the memory layer; generalize it across surfaces.

**Implementation note**: all of these are small, targeted LLM calls — not chat. They're completions that fit into the existing form fields. Use the user's BYO key. Cache aggressively. Every suggestion is a one-click accept/reject, never silent.

### 5.4 Execution Trace per task

Every task accrues a timeline of structured events: prompts that named this task, files touched in commits that mentioned it, PRs that link to it, MCP tool calls scoped to its space/project while it was active, test runs.

Data sources:
- Existing `mcpLogs` table (already captures every MCP tool call with spaceId/projectId) — join on active task at the time of the call
- Local git watcher (desktop-only) — commits, branches, PRs
- GitHub webhook (cloud) — PR lifecycle events
- Agent chat transcripts (local) — when a Claude Code session mentioned a task slug

The detail view gains a new "Activity" tab showing this timeline. Hover on any event to see what changed.

### 5.5 Ambient Memory Capture *(desktop-only, or dramatically better on desktop)*

A background service watches local signals and proposes memories to the review queue:

- **Git commits**: on commit, read the message + diff summary. If the message contains a decision signal ("migrated to…", "switched from…", "decided to…"), propose a memory with the commit as provenance.
- **PR descriptions**: on PR merge (via `gh` polling or webhook), extract the rationale section as a memory.
- **File-level conventions**: detect new patterns in your code (e.g., first use of a library, new file structure) and propose a fact memory.
- **Agent session endings**: when an MCP session closes after significant tool activity, propose a summary memory of what was done.

All proposals go to the review queue — never auto-land. User approves, edits, or rejects. Rejections train: "Tim never keeps memories about formatting changes" becomes a learned filter.

### 5.6 Definition-of-Done Verifier *(stretch)*

A task with a DoD spec can be verified automatically:
- `tests: ["npm test", "cd packages/convex && npm test"]` — runs, attaches pass/fail
- `files: ["packages/web/**/*.tsx"]` must exist/be modified
- `pr: "dodotdev/dodev-ai#42"` must be merged

Run locally in desktop (sandboxed in the app's working directory). Failed verification returns the task to "In Progress" with the failure reason attached. Successful verification unlocks "Mark Done" or auto-transitions.

Not in MVP. v0.3 or later.

---

## 6. Tech direction

### Stack choice (confirmed)

- **Electron**, not Tauri.
- **Vite + TanStack** for the renderer — migrate the existing Next.js App Router dashboard to a Vite SPA using TanStack Router + TanStack Query. This unifies routing/query story across web and desktop and drops Next.js's SSR baggage we don't use.
- **Convex** remains the backend. Realtime subscriptions work great inside Electron.
- **MCP server as a local subprocess** spawned by the main process. Same `@dodev/mcp-server` binary users already install via npm — shared codebase, not a fork. Listens on a local port or stdio depending on agent config.
- **SQLite** (via better-sqlite3) in the main process for: ambient-capture buffer, execution-trace event cache, local prompt history, search index for fast global search across cached content.
- **BYO API keys** stored in keychain (macOS) / credential manager (Windows) / libsecret (Linux) via `keytar` or similar.

### What the web dashboard needs before desktop work starts

1. **Migrate `apps/web` from Next.js App Router to Vite + TanStack Router + TanStack Query.** This is a real chunk of work (~2–3 weeks) but pays for itself: same codebase powers web and desktop, simpler mental model, better DX. Convex React hooks port 1:1.
2. Extract shared UI into `packages/ui` if not already. Route definitions move from `app/` to a TanStack `routeTree`.
3. The existing components (SpaceHeader, ItemDetailView, TaskForm, NewProjectDialog, ProjectFilter, etc.) should move unchanged.

### Electron shell

- **Main process**: spawns MCP server subprocess, manages global hotkey, watches filesystem, handles notifications, talks to keychain.
- **Renderer**: loads the Vite-built SPA. Uses a preload script with a typed IPC bridge exposed via `contextBridge`.
- **Auto-update**: `electron-updater` against GitHub Releases (until we have our own release infra).
- **Notarization** on macOS, code signing on Windows.

### Running the MCP server locally

- On app start, main process spawns the MCP server binary. Agents configured to point at `http://localhost:<port>/mcp` or stdio (via `.mcp.json`) hit the local instance.
- The local MCP server is identical to the published one — no fork. Version pinned per release.
- Secrets flow from keychain → main process → spawned subprocess env.

### Offline strategy

- Convex has good online behavior; don't build a full offline mode.
- Cache the last-seen state in SQLite for cold-start and brief disconnects.
- Ambient-capture events buffer locally and replay when online.
- Supervisor chat messages queue locally when offline and send on reconnect.

---

## 7. Data model changes

Additive on the existing Convex schema. None of these break v0.1.x callers.

### 7.1 Proposed state + provenance

Every table that can be proposed (tasks, issues, memories, status transitions) gains:

```ts
state: v.union(
  v.literal("active"),       // current lifecycle
  v.literal("proposed"),     // awaiting review
  v.literal("rejected"),     // kept for learning
)
proposedBy: v.optional(v.string())       // agent id, "commit-watcher", etc.
proposedAt: v.optional(v.number())
proposalSource: v.optional(v.string())   // commit sha, pr url, mcp call id
proposalReason: v.optional(v.string())
rejectionReason: v.optional(v.string())  // free-text, on reject
```

### 7.2 Execution events

New table:

```ts
executionEvents: defineTable({
  userId: v.id("users"),
  spaceId: v.id("spaces"),
  projectId: v.optional(v.id("projects")),
  taskId: v.optional(v.id("tasks")),
  issueId: v.optional(v.id("issues")),
  kind: v.union(
    v.literal("mcp_tool_call"),
    v.literal("git_commit"),
    v.literal("pr_opened"),
    v.literal("pr_merged"),
    v.literal("test_run"),
    v.literal("agent_session_start"),
    v.literal("agent_session_end"),
  ),
  payload: v.any(),
  createdAt: v.number(),
})
```

### 7.3 DoD spec on tasks

```ts
dod: v.optional(v.object({
  tests: v.optional(v.array(v.string())),
  files: v.optional(v.array(v.string())),
  pr: v.optional(v.string()),
  custom: v.optional(v.string()),
}))
```

### 7.4 Chat threads

New table for supervisor chat persistence:

```ts
chatThreads: defineTable({
  userId: v.id("users"),
  spaceId: v.id("spaces"),
  projectId: v.optional(v.id("projects")),
  lastActivityAt: v.number(),
}).index("by_user_scope", ["userId", "spaceId", "projectId"])

chatMessages: defineTable({
  threadId: v.id("chatThreads"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
  content: v.string(),
  toolCalls: v.optional(v.any()),
  createdAt: v.number(),
}).index("by_thread", ["threadId", "createdAt"])
```

### 7.5 AI-enhancement audit trail

Optional: keep a record of AI-assisted authoring decisions to improve the model later.

```ts
aiSuggestions: defineTable({
  userId: v.id("users"),
  surface: v.string(),            // "task_create", "memory_enhance", ...
  input: v.any(),
  suggestion: v.any(),
  accepted: v.boolean(),
  editedBeforeAccept: v.boolean(),
  createdAt: v.number(),
})
```

---

## 8. UX sketches (text)

### Primary landing view

```
┌─────────────────────────────────────────────────────────┐
│ ☰  dodev — do-dev-unified ▸ API Service           ⚡ ? │  (menubar)
├──────────┬──────────────────────────────────────────────┤
│ Overview │  Review Queue                           12   │
│ Review ● │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│ Tasks    │  ◎ Task proposed "Add rate limit on /login"  │
│ Issues   │     from claude-code session 2h ago          │
│ Memories │     Confidence 0.82 · Space DO · Project API │
│ Chat     │     [ approve ]  [ edit ]  [ reject ]        │
│ Activity │                                              │
│ Settings │  ◆ Memory proposed "We migrated from pg → … │
│          │     from commit a3f91c2 · 3h ago             │
├──────────┤     [ approve ]  [ edit ]  [ reject ]        │
│ + space  │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Quick-capture (global hotkey, ⌘⇧D)

Floating window, always scoped to frontmost workspace if linked. Title field with live duplicate detection. Type / submit / hit enter. No modal dance.

### Supervisor chat

Persistent thread docked or full-window. Every assistant message can reference tasks/memories by slug (clickable). Tool calls render as collapsible inline cards showing what the agent did. The chat itself is searchable.

### AI-assisted task create

The existing TaskForm, plus a subtle AI icon next to the title input. Type a sentence → icon pulses → inline expansion with suggested description, DoD, labels, project tag. Every suggestion is accepted/rejected individually. The form remembers which suggestions you tend to accept.

---

## 9. Rollout plan

Sequenced so each step is independently shippable and validates the next.

| Phase | Scope | Duration | Gate to next |
|---|---|---|---|
| **0** | **Vite/TanStack migration** of `apps/web` | 2–3 wk | Web dashboard feature-parity with Next.js version |
| **1** | **Review Queue on web** (schema + UI, no desktop yet) | 2–3 wk | Thesis validated — users actually use it to review agent output |
| **2** | **AI-Assisted Authoring on web** (draft-to-crisp, auto-classify, duplicate detection, memory enhance) | 3–4 wk | Acceptance rate of suggestions > 50%; users say they'd miss it |
| **3** | **Electron shell** around the Vite app + local MCP subprocess + global hotkey + quick capture | 3–4 wk | Beta binary distributed to 5–10 users |
| **4** | **Supervisor Chat** (scoped to active space/project, MCP-tool access, persistent thread) | 4–6 wk | Daily active usage of the chat surface |
| **5** | **Ambient memory capture** via git watcher | 3–4 wk | Users accept ≥ 30% of ambient proposals |
| **6** | **Execution trace** surfacing in task detail | 2–3 wk | — |
| **7** | **DoD verifier** | 4–6 wk | — |
| **8** | **Team features** (cloud sync of review queue, multi-reviewer) | later | — |

Total to an MVP with pillars 1–4: ~13–18 weeks.

---

## 10. Success metrics

- **Installation**: time-to-first-task-review < 5 minutes from desktop app download.
- **Review throughput**: ≥ 80% of agent-proposed items get a human decision within 24h (vs. sitting forever in an inbox).
- **AI-assist acceptance rate**: ≥ 50% of AI-suggested fields (titles, descriptions, tags, DoDs) accepted without edits.
- **Agent activity visibility**: users can answer "what did my agents do this week?" in one click.
- **Memory growth**: ≥ 5× the memory-add rate of v0.1.x users, driven by ambient capture.
- **Retention**: weekly active use of the supervisor chat surface by week 4 of install.

---

## 11. Open questions

1. **Migrating the web dashboard off Next.js** — is that acceptable scope for the first commit, or should the Electron app embed the existing Next.js app temporarily (e.g., via the `next export` path) while the Vite migration runs in parallel? Recommend: do the migration first; it pays for itself quickly.
2. **Single Electron binary, or separate installers per OS?** Auto-update strategy? `electron-updater` default.
3. **How do MCP agents discover the local server?** Two options: (a) app writes `~/.mcp.json` on install so Claude Code finds it automatically, (b) app exposes a menubar item with "copy MCP config" the user pastes into their agent. Probably both.
4. **Cloud vs self-hosted** positioning after desktop: does the desktop app replace cloud.dodev.ai, or complement it? Recommend: desktop is self-hosted-only by default; users can *optionally* point at a cloud Convex deployment for team sync. Billing stays cloud-only.
5. **AI provider abstraction** — how many providers at launch? Anthropic + OpenAI + local-via-Ollama is a sane trio. Any fourth?
6. **Supervisor chat model default** — Claude Sonnet 4.6? Opus? Let the user pick, default to Sonnet for cost.
7. **Rejected memories as training data** — do we ever use them beyond per-user filtering? Cloud-hosted fine-tuning later? Out of scope for v1.
8. **Privacy story** for ambient capture — the watcher sees your git commits and file diffs. Make it opt-in per space, with clear scope controls ("watch this repo, ignore these paths").

---

## 12. What I don't yet know

- The **ambient capture** story on a large repo (10k+ commits, dozens of PRs/day) might need rate-limiting or batching. We should prototype against a real monorepo before committing to a v1 design.
- **DoD verifier sandboxing** — running arbitrary shell commands from a task spec is a foot-gun. Likely needs an explicit "trust this space's DoD commands" toggle per space, or even a whitelist of allowed commands.
- **Supervisor chat cost** at heavy use will surprise some users. Consider a built-in cost tracker in the settings pane, per-day token budget with soft warnings.

---

## 13. Decision log

- **2026-04-23**: Electron chosen over Tauri (developer preference, ecosystem familiarity).
- **2026-04-23**: Migrate `apps/web` from Next.js App Router to Vite + TanStack before the Electron work begins. Unifies the codebase.
- **2026-04-23**: MCP server runs as a spawned subprocess, not in-process. Same binary as npm-distributed.
- **2026-04-23**: BYO API keys at launch; no bundled credits.
- **2026-04-23**: Review Queue is the primary surface, replacing Overview as the default landing.
- **2026-04-23**: AI-Assisted Authoring is its own pillar, not a sub-feature of chat.
