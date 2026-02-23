# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DoMCP** is an open-source, AI-native task and memory management system built on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). It gives AI agents (Claude Code, Cursor, Windsurf, etc.) persistent, cross-session awareness of todos, issues, memories, and project context — with Linear-like project management features.

- **Website**: domcp.ai
- **npm package**: `@domcp/mcp-server`
- **Docker image**: `ghcr.io/dodotdev/domcp-ai:latest`
- **License**: MIT
- **Version**: 0.0.6

Shared do.dev conventions are loaded via `.claude/CLAUDE.md` (symlinked to `do-coders`).

## Architecture

Three core components communicate through Convex as the single source of truth:

```
AI Agents ──(MCP stdio)──> MCP Server ──(HTTPS)──> Convex Backend
                                                         ↑
Web Dashboard (Next.js) ──(Convex React client)──────────┘
```

- **MCP Server** (`packages/mcp-server`): Stateless TypeScript server exposing 31 tools across 7 categories. Currently supports stdio transport only. Streamable HTTP transport is planned but not yet implemented. Every tool call maps to a single Convex function.
- **Convex Backend** (`packages/convex`): Schema (8 tables, 27+ indexes), queries, mutations, actions. Handles auth, quotas, full-text search, and scheduled tasks. Vector search schema is defined but not yet wired up.
- **Web App** (`apps/web`): Next.js 15 App Router — landing page, dashboard layout. WorkOS AuthKit configured. Dashboard components are scaffolded but mostly stubs. Stripe billing not yet integrated.
- **Shared Types** (`packages/shared`): 15 TypeScript interfaces, plan constants, validation limits, and default project config used by both MCP server and web app.

## Monorepo Structure

```
domcp-ai/
├── apps/web/                # Next.js 15 web app (scaffolded, partially functional)
├── packages/
│   ├── mcp-server/          # MCP server (npm-publishable)
│   │   └── src/
│   │       ├── tools/       # Tool implementations (7 files: todos, issues, memories, projects, context, config, cycles)
│   │       ├── auth/        # API key hashing (SHA-256)
│   │       ├── server.ts    # MCP server setup and request handlers
│   │       ├── index.ts     # Entry point (stdio transport)
│   │       ├── cli.ts       # CLI (generate-key, serve)
│   │       └── convex-client.ts  # Convex HTTP client wrapper
│   ├── convex/              # Convex schema + functions
│   │   └── convex/
│   │       ├── schema.ts    # Database schema (8 tables, 27+ indexes)
│   │       ├── todos.ts     # Todo CRUD (5 functions)
│   │       ├── issues.ts    # Issue CRUD (5 functions)
│   │       ├── memories.ts  # Memory CRUD + search (5 functions)
│   │       ├── projects.ts  # Project CRUD + getContext (6 functions)
│   │       ├── cycles.ts    # Cycle/sprint CRUD (5 functions)
│   │       ├── projectConfig.ts  # Statuses, labels, members, estimates, persona (9 functions)
│   │       ├── users.ts     # User creation/lookup (7 functions)
│   │       ├── sessions.ts  # Active project tracking (2 functions)
│   │       ├── usage.ts     # Quota tracking (1 function)
│   │       ├── migrations.ts # Data migration helpers
│   │       ├── http.ts      # HTTP router (Stripe webhook placeholder)
│   │       └── lib/
│   │           ├── auth.ts  # API key auth + quota checks
│   │           └── utils.ts # Usage increment, period helpers
│   └── shared/              # Shared types and validators
│       └── src/
│           ├── types.ts     # 15 interfaces: Todo, Issue, Memory, Project, Cycle, User, etc.
│           ├── constants.ts # Plan limits, rate limits, validation limits, default statuses/estimates
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
pnpm dev:web                    # Start web app only (port 5031)
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

**Cloud hosted ($10-20/mo)**: Planned. Will connect to `mcp.domcp.ai` via Streamable HTTP. Managed Convex, rate limiting, and usage quotas per plan tier. Not yet implemented.

## Authentication

- **Self-hosted**: API key generated via `pnpm generate-key`, SHA-256 hashed and stored in Convex. Every MCP call passes `apiKeyHash` for validation.
- **Cloud**: WorkOS AuthKit (OAuth via Google/GitHub/email). Dashboard provides API key for MCP client config.

All Convex functions authenticate via `authenticateApiKey()` in `packages/convex/convex/lib/auth.ts`.

## Data Model (Convex)

Eight tables: `users`, `projects`, `todos`, `issues`, `memories`, `cycles`, `sessions`, `usage`.

Key patterns:
- `userId` on every row — all queries are user-scoped
- Indexes follow query patterns: `by_user_project_status` for "pending todos in project X"
- Full-text search indexes on `todos.title`, `issues.title`, and `memories.content`
- Vector index on `memories.embedding` (1536 dimensions, schema defined but not yet used)
- `usage` table tracks monthly quotas per user (free plan: 1 project, 100 todos, 200 issues, 50 memories)
- Projects embed their config: custom workflow statuses, labels, members, estimate scale, AI persona
- Todos and issues have Linear-like fields: `statusId`, `labelIds`, `assigneeId`, `estimate`, `cycleId`
- Projects have auto-incrementing `todoCounter` and `issueCounter` for human-readable numbering

See `docs/CONVEX_SCHEMA.md` for complete schema and function signatures.

## MCP Tools

31 tools across 7 categories — see `docs/MCP_TOOLS.md` for full spec:

- **Todos** (6): `create_todo`, `update_todo`, `complete_todo`, `list_todos`, `get_todo`, `delete_todo`
- **Issues** (6): `create_issue`, `update_issue`, `close_issue`, `list_issues`, `get_issue`, `delete_issue`
- **Memories** (5): `add_memory`, `search_memories`, `list_memories`, `update_memory`, `delete_memory`
- **Projects** (6): `create_project`, `list_projects`, `get_project`, `update_project`, `archive_project`, `set_active_project`
- **Config** (7): `update_project_statuses`, `add_project_label`, `remove_project_label`, `add_project_member`, `remove_project_member`, `update_estimate_scale`, `update_project_persona`
- **Cycles** (5): `create_cycle`, `list_cycles`, `get_cycle`, `update_cycle`, `delete_cycle`
- **Context** (1): `get_context` — session bootstrapper returning active project, pending todos, recent memories, project config, and active cycle

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
