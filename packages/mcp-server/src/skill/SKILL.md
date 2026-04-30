---
name: dodev
description: Load dodev.ai project context, ranked next-best-work, session recap, latest handovers, and curated memory digest in one shot.
---

# /dodev — Session priming

dodev.ai keeps tasks, issues, memories, snapshots, handovers, and reviews in Convex so every AI coding session builds on the last. The `/dodev` skill loads everything you need at session start in a single, opinionated sequence.

## Step 0 — Force-surface deferred MCP tools

On Claude Code desktop and web, MCP tool schemas are deferred until referenced. The `dodev_*` tools you'll use in steps below are NOT in your default tool list on a cold session. **Before doing anything else**, make a single `ToolSearch` call with `query: "dodev"` and `max_results: 30`. This is idempotent: if the tools are already in your list (terminal CLI), the call simply returns the same set.

If `ToolSearch` is unavailable on this harness, skip and continue — step 1's `get_context` call will either succeed or fail loudly.

## Step 1 — Routing

Parse the user's invocation:

- `/dodev` → full session priming (default, see Step 2).
- `/dodev recap` → just `recap` and stop.
- `/dodev handover` → draft a handover for the current session and call `create_handover`.
- `/dodev snapshot` → call `take_snapshot`.
- `/dodev review <plan|code> <taskId>` → call `request_review` against the active task and surface the verdict.
- `/dodev help` → show the table below and stop.

Anything else → fall through to Step 2.

## Step 2 — Session priming sequence

Call these tools IN ORDER. Use the results to compose the summary in Step 3. Auto-detect scope by passing nothing for spaceId/projectId — `get_context` will resolve from the linked workspace.

1. `get_context` — active space + project, top pending tasks, persona, effective config, workspace match. **Mandatory first call.**
2. `recap` (with `markdown: true`) — what changed since the last snapshot. If no baseline exists, render "First session — no prior snapshot."
3. `latest_handovers` with `count: 3` — narrative reasoning history.
4. `memory_digest` with `limit: 15` — curated memory ranked by reinforcement + recency. **Different from `search_memories` — this is the "must-know" set.**
5. `recommend` with `count: 5` — ranked next-best-work with categories and reasons.
6. Read `RULES.md` if it exists in the project root (best-effort).
7. Run `git log --oneline -10` via Bash (best-effort — skip if not a git repo).

If `get_context` reveals no active space and no spaces at all, dodev.ai will auto-create one from the workspace path. Continue with the rest of the sequence on the new space.

## Step 3 — Present summary (REQUIRED)

Open with a 2-3 sentence prose intro: project name, what the last handover covered, anything urgent (critical issues, debt-trend warnings, blockers).

Then render these sections AS TABLES (do not fold them into prose):

**Recap** — paste the markdown from step 2.4 above as-is.

**Ready to Work** — top 5 from `recommend`, formatted:

```
| ID | Title | Category | Why |
|----|-------|----------|-----|
| ... | ... | critical_issue | Critical severity — address before new features |
```

**Open Issues** — only if any open critical/major issues exist.

**Key Memories** — top 5 from `memory_digest` (one bullet each, prefix with `[Nx]` for reinforcement count when N > 0).

**Latest Handover** — first sentence of the latest handover's `tldr`.

End with an `AskUserQuestion`:

- "Work on `<top recommendation>` (Recommended)"
- "Something else" — free-form
- "Just brief me" — answer questions, don't pick work

## Step 4 — During and after the session

**Storing knowledge**

- Discovered a non-obvious fact, made an architectural decision, or learned a user preference? Call `add_memory` with the right `type` and tags.
- A memory you used proved true again? Call `reinforce_memory` instead of duplicating it. Reinforced memories surface higher in future digests.
- A memory is now wrong? `supersede_memory` — keeps the old row marked deprecated for audit, links the new one.

**Reviewing work (optional gate)**

- Before implementing a non-trivial change: `request_review` with `stage: "plan"` and the plan markdown.
- After implementation, before `complete_task`: `request_review` with `stage: "code"` and the unified diff.
- If the project sets `requireReview: { plan: true, code: true }`, `complete_task` will refuse to mark the task complete without an approved review of that stage. The error code `REVIEW_REQUIRED` tells you which stage is missing — fix the artifact and run `request_review` again.

**Reviewer key (bring-your-own)**

dodev never holds your Anthropic key. Set it at any scope; resolution is `project → space → user → env`:

- `set_user_reviewer_settings({ apiKey })` — your key for everything.
- `set_space_reviewer_settings({ spaceId, apiKey })` — shared key for a team's space.
- `set_project_reviewer_settings({ projectId, apiKey })` — override for one project.
- Or self-hosters can set `ANTHROPIC_API_KEY` on their Convex deployment env (no per-user setup).

`effective_reviewer_settings` shows the resolved model + where each field came from, without leaking the key. If `request_review` returns `REVIEWER_KEY_MISSING`, no scope had a key set and the env var isn't there.

**Closing the session**

When the session has produced meaningful changes:

1. `take_snapshot` (sets the baseline for next session's `recap`).
2. `create_handover` with title, tldr, and markdown body. Populate `decisions`, `blockers`, `nextSteps` arrays — `recommend()` boosts items named here on the next session start.

If you see a PreCompact hook installed (run `cat ~/.claude/settings.json` to check), `take_snapshot` is auto-called for you before context compaction. Even with the hook, write a handover at session end — snapshots capture state, handovers capture narrative.

## Tool reference (compact)

| Tool | When to use |
|---|---|
| `get_context` | First call every session. |
| `recap` | "What happened since last time I touched this?" |
| `latest_handovers` | Read past sessions' decisions/blockers/nextSteps. |
| `memory_digest` | Curated must-know memories for prompt injection. |
| `recommend` | "What should I work on next?" with ranked rationale. |
| `add_memory` | Store atomic facts/decisions/preferences/learnings. |
| `reinforce_memory` | Bump counter on a memory that proved true again. Prefer over duplicate add_memory. |
| `supersede_memory` | Replace an outdated memory; old row marked deprecated. |
| `take_snapshot` | Freeze state. Run before compaction or session end. |
| `create_handover` | Append-only narrative session document. |
| `request_review` | Second-AI check on a plan or diff. |
| `search_memories` | Query-driven memory lookup (different from digest). |
| `create_task` / `update_task` / `complete_task` | Standard task workflow. Use `parentTaskId` to nest under an umbrella. |

## Active scope rules

`get_context` resolves the active space and project from the workspace path or repo URL when you don't pass them. All other tools follow the same rule: pass nothing and they'll narrow to whatever scope `get_context` resolved. Pass `projectId` to narrow further; `projectId` always wins over `spaceId`.

When in doubt, prefer leaving scope unset — bubble-up search and the recap defaults will do the right thing.
