# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dodev.ai** is an open-source, AI-native task and memory management system built on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). It gives AI agents (Claude Code, Cursor, Windsurf, etc.) persistent, cross-session awareness of tasks, issues, memories, and project context — with Linear-like project management features.

- **Website**: dodev.ai
- **npm package**: `@dodev/mcp-server`
- **Docker image**: `ghcr.io/dodotdev/dodev-ai:latest`
- **License**: MIT
- **Version**: 0.1.0

Shared do.dev conventions are loaded via `.claude/CLAUDE.md` (symlinked to `do-coders`).

## dodev.ai Usage (MANDATORY)

This workspace has a connected dodev.ai MCP server. You MUST use it proactively:

### Session Start
- **Always** call `get_context` at the beginning of every session to load the active space and project (auto-resolved from workspace links), pending tasks, recent memories, effective config, and `configSource` breakdown.
- **Always** call `search_memories` before starting any non-trivial task to check for relevant past decisions, gotchas, and preferences. Searches bubble up — a project-scoped search also sees parent-space and global memories.

### During Work
- **Store memories** proactively via `add_memory` whenever you discover facts about the codebase, make architectural decisions, learn user preferences, encounter non-obvious behavior, or resolve tricky bugs. Write each memory so a future agent with no context can understand it.
- **Create tasks** via `create_task` for follow-up work, known issues, or tasks you can't complete right now.
- **Create issues** via `create_issue` for bugs found during development.
- **Update tasks/issues** as you work — mark them `in_progress` when starting, `completed` when done.

### Memory Best Practices
- Use type: `"fact"` for codebase/infrastructure facts, `"decision"` for architectural choices, `"preference"` for user conventions, `"learning"` for gotchas and lessons learned.
- Tag memories consistently with lowercase tags (e.g. `debugging`, `architecture`, `build`, `gotcha`).
- Prefer many small focused memories over fewer large ones.
- Update existing memories rather than creating duplicates.

### Spaces and Projects (v0.1.0+)
- The active dodev.ai space is **"dodev"** (slug: DODEV, ID: `jd71k24g625k3dqk4xq71szmqd81qbdv`).
- Spaces contain optional nested **projects**. If a project is active, it narrows context automatically; items created with a `projectId` get slugs like `DODEV-API-42` and use per-project counters.
- Pass `projectId` on `create_task`/`create_issue`/`add_memory` when the work belongs to a specific project. Omit it for space-level items.

## Architecture

Three core components communicate through Convex as the single source of truth:

```
AI Agents ──(MCP stdio)──> MCP Server ──(HTTPS)──> Convex Backend
                                                         ↑
Web Dashboard (Next.js) ──(Convex React client)──────────┘
```

- **MCP Server** (`packages/mcp-server`): Stateless TypeScript server exposing 40+ tools across 8 categories (tasks, issues, memories, spaces, projects, context, cycles, space/project config). Supports both stdio and Streamable HTTP transports. Every tool call maps to a single Convex function.
- **Convex Backend** (`packages/convex`): Schema (13+ tables) covering the hierarchy user → space → project (optional) → tasks/issues/memories/cycles/versions. Queries, mutations, actions handle auth, quotas, full-text search, vector search, and scheduled tasks.
- **Web App** (`apps/web`): Next.js 15 App Router — landing page, dashboard layout. WorkOS AuthKit configured. Dashboard components are scaffolded but mostly stubs. Stripe billing not yet integrated.
- **Shared Types** (`packages/shared`): 15 TypeScript interfaces, plan constants, validation limits, and default project config used by both MCP server and web app.

## Monorepo Structure

```
domcp-ai/
├── apps/web/                # Next.js 15 web app (scaffolded, partially functional)
├── packages/
│   ├── mcp-server/          # MCP server (npm-publishable)
│   │   └── src/
│   │       ├── tools/       # Tool implementations — tasks, issues, memories, spaces, projects, context, cycles, space-config, attachments, comments, linking, versions
│   │       ├── auth/        # API key hashing (SHA-256)
│   │       ├── server.ts    # MCP server setup and request handlers
│   │       ├── index.ts     # Entry point (stdio transport)
│   │       ├── cli.ts       # CLI (generate-key, serve)
│   │       └── convex-client.ts  # Convex HTTP client wrapper
│   ├── convex/              # Convex schema + functions
│   │   └── convex/
│   │       ├── schema.ts    # Database schema (13+ tables: users, spaces, projects, tasks, issues, memories, cycles, versions, sessions, attachments, comments, usage, mcpLogs, ...)
│   │       ├── tasks.ts     # Task CRUD
│   │       ├── issues.ts    # Issue CRUD
│   │       ├── memories.ts  # Memory CRUD + search (keyword, semantic, hybrid) with scope bubble-up
│   │       ├── spaces.ts    # Space CRUD + getContext
│   │       ├── spaceConfig.ts    # Space-level statuses, labels, members, estimates, persona
│   │       ├── projects.ts       # Project CRUD + linking (v0.1.0+)
│   │       ├── projectConfig.ts  # Project-level config overrides (v0.1.0+)
│   │       ├── cycles.ts    # Cycle/sprint CRUD (space or project scoped)
│   │       ├── versions.ts  # Release/changelog versions
│   │       ├── users.ts     # User creation, lookup, settings (defaultSpace / defaultProject)
│   │       ├── sessions.ts  # Active space/project tracking per agent
│   │       ├── attachments.ts / attachmentsInternal.ts  # File uploads
│   │       ├── comments.ts  # Thread comments on tasks/issues
│   │       ├── usage.ts     # Quota tracking per period
│   │       ├── mcpLogs.ts   # MCP tool-call logging
│   │       ├── agentSessions.ts  # MCP transport sessions (HTTP)
│   │       ├── oauthClients.ts   # MCP OAuth clients
│   │       ├── migrations.ts     # Historical migrations (currently empty after v0.1.0 cleanup)
│   │       ├── http.ts      # HTTP router (file-serving, webhooks)
│   │       └── lib/
│   │           ├── auth.ts  # API key auth + quota checks
│   │           └── utils.ts # Usage increment, period helpers
│   └── shared/              # Shared types and validators
│       └── src/
│           ├── types.ts     # Interfaces: Space, Project, Task, Issue, Memory, Cycle, User, ContextResponse, ...
│           ├── constants.ts # Plan limits (incl. projectsPerSpace), rate limits, validation limits, default statuses/estimates
│           └── validators.ts # Input validation helpers
├── docker/                  # Docker Compose for self-hosting
├── docs/                    # Design docs (architecture, schema, tool specs)
├── .github/workflows/       # CI workflow (lint, build, Docker push to GHCR)
├── biome.json               # Biome 2.0.5 linter/formatter config
├── turbo.json               # Turborepo build config
└── tsconfig.json            # Root TypeScript config (strict mode)
```

## Development Commands

```bash
pnpm install                    # Install all dependencies
pnpm build                      # Build all packages
pnpm check                      # Biome lint + format check
pnpm check:fix                  # Auto-fix lint + format issues
pnpm typecheck                  # TypeScript strict mode check

# Development servers
pnpm dev:all                    # Start web + Convex together
pnpm dev:web                    # Start web app only (port 3041)
pnpm dev:convex                 # Start Convex dev server
pnpm dev:mcp                    # Start MCP server in stdio dev mode

# API key
pnpm generate-key               # Generate API key and store in Convex
```

## Convex Deployment

- **Development**: `notable-gazelle-779` (`https://notable-gazelle-779.convex.cloud`)
- **Production**: `proficient-buzzard-939` (`https://proficient-buzzard-939.convex.cloud`)

Convex config is in `packages/convex/.env.local` (CONVEX_DEPLOYMENT).

## Deployment Modes

**Self-hosted (free)**: User provides their own Convex deployment. MCP server runs via Docker or npx. No feature limits except vector search (needs embedding API key).

**Cloud hosted ($10-20/mo)**: Planned. Will connect to `mcp.dodev.ai` via Streamable HTTP. Managed Convex, rate limiting, and usage quotas per plan tier. Not yet implemented.

## Authentication

- **Self-hosted**: API key generated via `pnpm generate-key`, SHA-256 hashed and stored in Convex. Every MCP call passes `apiKeyHash` for validation.
- **Cloud**: WorkOS AuthKit (OAuth via Google/GitHub/email). Dashboard provides API key for MCP client config.

All Convex functions authenticate via `authenticateApiKey()` in `packages/convex/convex/lib/auth.ts`.

## Data Model (Convex)

Eight tables: `users`, `projects`, `tasks`, `issues`, `memories`, `cycles`, `sessions`, `usage`.

Key patterns:
- `userId` on every row — all queries are user-scoped
- Indexes follow query patterns: `by_user_project_status` for "pending tasks in project X"
- Full-text search indexes on `tasks.title`, `issues.title`, and `memories.content`
- Vector index on `memories.embedding` (1536 dimensions, schema defined but not yet used)
- `usage` table tracks monthly quotas per user (free plan: 1 project, 100 tasks, 200 issues, 50 memories)
- Projects embed their config: custom workflow statuses, labels, members, estimate scale, AI persona
- Tasks and issues have Linear-like fields: `statusId`, `labelIds`, `assigneeId`, `estimate`, `cycleId`
- Projects have auto-incrementing `taskCounter` and `issueCounter` for human-readable numbering

See `docs/CONVEX_SCHEMA.md` for complete schema and function signatures. See `docs/MEMORY.md` for the memory architecture design (semantic search, hybrid search, embedding generation, consolidation, and phased implementation plan).

## MCP Tools

See `docs/MCP_TOOLS.md` for full spec. Summary by category:

- **Tasks** (6): `create_task`, `update_task`, `complete_task`, `list_tasks`, `get_task`, `delete_task`. Accept `spaceId` and/or `projectId` (projectId wins when both are present).
- **Issues** (6): `create_issue`, `update_issue`, `close_issue`, `list_issues`, `get_issue`, `delete_issue`. Same scoping.
- **Memories** (5): `add_memory`, `search_memories`, `list_memories`, `update_memory`, `delete_memory`. Support project/space/global scopes and a `bubbleUp` flag (default: on).
- **Spaces** (6): `create_space`, `list_spaces`, `get_space`, `update_space`, `archive_space`, `set_active_space`.
- **Projects** (9, v0.1.0+): `create_project`, `list_projects`, `get_project`, `update_project`, `archive_project`, `delete_project`, `set_active_project`, `link_project`, `unlink_project`.
- **Space Config** (mirror on `projectConfig`): `update_*_statuses`, `add/update/remove_*_label`, `add/update/remove_*_member`, `update_estimate_scale`, `update_persona`. Project config edits are independent snapshots for arrays; estimateScale/persona inherit from the space when unset.
- **Cycles** (5): `create_cycle`, `list_cycles`, `get_cycle`, `update_cycle`, `delete_cycle`. spaceId or projectId scoping.
- **Versions** (6): `create_version`, `list_versions`, `get_version`, `update_version`, `release_version`, `delete_version`.
- **Context** (2): `get_context` (session bootstrapper with active project/space narrowing, effective config + configSource, memory bubble-up, workspace auto-detection), `get_setup_instructions`.
- **Linking** (2): `link_space`, `unlink_space` for workspace path/repo auto-resolution.
- **Attachments, Comments**: CRUD on file attachments and threaded comments for tasks/issues.

Conventions: All tools return JSON. Timestamps are Unix ms. IDs are opaque Convex document IDs.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| MCP Server | TypeScript + `@modelcontextprotocol/sdk` | ^1.12.1 |
| Database | Convex | ^1.31.2 |
| Web | Next.js 15 + Tailwind CSS v4 + shadcn/ui | 15.3.0 |
| Auth | WorkOS AuthKit | 2.14.0 |
| Payments | Stripe | planned, not integrated |
| Linting | Biome | 2.0.5 |
| Monorepo | Turborepo + pnpm 10 | 10.12.1 |
| Container | Docker (Alpine Node 20) | — |
| CI/CD | GitHub Actions | — |

## Branch and Commit Conventions

- Branches: `feat/`, `fix/`, `docs/`, `refactor/` prefixes
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) format
