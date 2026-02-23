# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DoMCP** is an open-source, AI-native task and memory management system built on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). It gives AI agents (Claude Code, Cursor, Windsurf, etc.) persistent, cross-session awareness of todos, memories, and project context.

- **Website**: domcp.ai
- **npm package**: `@domcp/mcp-server`
- **Docker image**: `ghcr.io/dodotdev/domcp-ai:latest`
- **License**: MIT

Shared do.dev conventions are loaded via `.claude/CLAUDE.md` (symlinked to `do-coders`).

## Architecture

Three core components communicate through Convex as the single source of truth:

```
AI Agents ──(MCP stdio/HTTP)──> MCP Server ──(HTTPS)──> Convex Backend
                                                              ↑
Web Dashboard (Next.js) ──(Convex React client)───────────────┘
```

- **MCP Server** (`packages/mcp-server`): Stateless TypeScript server exposing todo/memory/project tools. Supports stdio (local) and Streamable HTTP (cloud) transports. Every tool call maps to a single Convex function.
- **Convex Backend** (`packages/convex`): Schema, queries, mutations, actions. Handles auth, quotas, full-text search, vector search (cloud Pro/Team), and scheduled tasks.
- **Web App** (`apps/web`): Next.js 16 App Router — landing page, MDX docs, real-time dashboard, Stripe billing. (Phase 2)
- **Shared Types** (`packages/shared`): Validators and type definitions used by both MCP server and web app.

## Monorepo Structure

```
domcp-ai/
├── apps/web/                # Next.js web app (Phase 2)
├── packages/
│   ├── mcp-server/          # MCP server (npm-publishable)
│   │   └── src/
│   │       ├── tools/       # Tool implementations (todos, memories, projects, context)
│   │       ├── auth/        # API key hashing, rate limiting
│   │       ├── server.ts    # MCP server setup and request handlers
│   │       ├── index.ts     # Entry point (stdio transport)
│   │       ├── cli.ts       # CLI (generate-key, serve)
│   │       └── convex-client.ts  # Convex HTTP client wrapper
│   ├── convex/              # Convex schema + functions
│   │   └── convex/
│   │       ├── schema.ts    # Database schema (6 tables, 20 indexes)
│   │       ├── todos.ts     # Todo queries/mutations
│   │       ├── memories.ts  # Memory queries/mutations
│   │       ├── projects.ts  # Project queries/mutations + getContext
│   │       ├── users.ts     # User creation/lookup
│   │       ├── sessions.ts  # Active project tracking
│   │       ├── usage.ts     # Quota tracking
│   │       ├── http.ts      # HTTP router (Stripe webhook placeholder)
│   │       └── lib/
│   │           ├── auth.ts  # API key auth + quota checks
│   │           └── utils.ts # Usage increment, period helpers
│   └── shared/              # Shared types and validators
│       └── src/
│           ├── types.ts     # Todo, Memory, Project, User interfaces
│           ├── constants.ts # Plan limits, rate limits, validation limits
│           └── validators.ts # Input validation helpers
├── docker/                  # Docker Compose for self-hosting
├── docs/                    # Design docs (architecture, schema, tool specs)
├── .github/workflows/       # CI and release workflows
├── biome.json               # Biome linter/formatter config
├── turbo.json               # Turborepo build config
└── tsconfig.json            # Root TypeScript config
```

## Development Commands

```bash
pnpm install                    # Install all dependencies
pnpm build                      # Build all packages
pnpm check                      # Biome lint + format check
pnpm check:fix                  # Auto-fix lint + format issues
pnpm typecheck                  # TypeScript strict mode check

# Convex backend
pnpm dev:convex                 # Start Convex dev server (or: cd packages/convex && npx convex dev)

# MCP server
pnpm dev:mcp                    # Start MCP server in stdio dev mode

# Generate API key
pnpm generate-key               # Generate API key and store in Convex
```

## Convex Deployment

- **Development**: `calculating-kookabura-386` (`https://calculating-kookabura-386.convex.cloud`)
- **Production**: TBD

Convex config is in `packages/convex/.env.local` (CONVEX_DEPLOYMENT).

## Deployment Modes

**Self-hosted (free)**: User provides their own Convex deployment. MCP server runs via Docker or npx. No feature limits except vector search (needs embedding API key).

**Cloud hosted ($10-20/mo)**: Connects to `mcp.domcp.ai` via Streamable HTTP. Managed Convex, rate limiting, and usage quotas per plan tier. (Phase 3)

## Authentication

- **Self-hosted**: API key generated via `pnpm generate-key`, SHA-256 hashed and stored in Convex. Every MCP call passes `apiKeyHash` for validation.
- **Cloud**: WorkOS AuthKit (OAuth via Google/GitHub/email). Dashboard provides API key for MCP client config.

All Convex functions authenticate via `authenticateApiKey()` in `packages/convex/convex/lib/auth.ts`.

## Data Model (Convex)

Six tables: `users`, `projects`, `todos`, `memories`, `sessions`, `usage`.

Key patterns:
- `userId` on every row — all queries are user-scoped
- Indexes follow query patterns: `by_user_project_status` for "pending todos in project X"
- Full-text search indexes on `todos.title` and `memories.content`
- Vector index on `memories.embedding` (1536 dimensions, cloud Pro/Team only)
- `usage` table tracks monthly quotas per user (free plan: 1 project, 100 todos, 50 memories)

See `docs/CONVEX_SCHEMA.md` for complete schema and function signatures.

## MCP Tools

18 tools across 4 categories — see `docs/MCP_TOOLS.md` for full spec:

- **Todos** (6): `create_todo`, `update_todo`, `complete_todo`, `list_todos`, `get_todo`, `delete_todo`
- **Memories** (5): `add_memory`, `search_memories`, `list_memories`, `update_memory`, `delete_memory`
- **Projects** (6): `create_project`, `list_projects`, `get_project`, `update_project`, `archive_project`, `set_active_project`
- **Context** (1): `get_context` — session bootstrapper returning active project, pending todos, recent memories

Conventions: All tools return JSON. Timestamps are Unix ms. IDs are opaque Convex document IDs.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| MCP Server | TypeScript + `@modelcontextprotocol/sdk` | ^1.12.1 |
| Database | Convex | ^1.31.2 |
| Web (Phase 2) | Next.js 16 + Tailwind CSS v4 + shadcn/ui | — |
| Auth | WorkOS AuthKit | — |
| Payments | Stripe | — |
| Linting | Biome | 2.0.5 |
| Monorepo | Turborepo + pnpm 10 | — |
| Container | Docker | — |
| CI/CD | GitHub Actions | — |

## Branch and Commit Conventions

- Branches: `feat/`, `fix/`, `docs/`, `refactor/` prefixes
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) format
