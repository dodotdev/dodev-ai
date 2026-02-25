# dodev.ai

> **WARNING: This project is under active development and is NOT ready for production use.** APIs, schemas, and features are unstable and will change without notice. Do not rely on this for anything critical. We're building in public — contributions and feedback are welcome, but expect breaking changes frequently.

**AI-native task and memory management via the Model Context Protocol.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/dodotdev/dodev-ai)](https://github.com/dodotdev/dodev-ai)
![Status](https://img.shields.io/badge/status-in%20development-orange)

dodev.ai gives AI agents persistent memory and task tracking across sessions and projects. Built on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), it works with Claude Code, Cursor, Windsurf, and any MCP-compatible client.

**Website:** [dodev.ai](https://dodev.ai)

---

## Why dodev.ai?

AI agents are powerful but forgetful. Every new session starts from scratch — no memory of what was decided, what's pending, or what was learned. dodev.ai fixes this by giving agents a persistent brain:

- **Tasks** — Track tasks across sessions. An agent can pick up exactly where it left off.
- **Issues** — Track bugs, features, and improvements with type and severity.
- **Memories** — Store decisions, context, and learnings. "We chose Postgres because..." is never lost.
- **Projects** — Organize work across multiple codebases with Linear-like config: custom statuses, labels, members, estimates, and sprint cycles.

```
You: "What's left to do on the auth system?"
Agent: *checks dodev.ai* "3 pending tasks: implement refresh tokens,
       add rate limiting to login, and write integration tests.
       Memory note from last session: we decided to use httpOnly
       cookies instead of localStorage for token storage."
```

## Features

- **35 MCP tools** across 8 categories (tasks, issues, memories, projects, config, cycles, context, linking)
- **Linear-like project management** — custom workflow statuses, labels, team members, estimate scales, sprint cycles
- **AI personas** — per-project system prompts that shape how agents interact with your project
- **Real-time sync** — Dashboard updates instantly when agents make changes (powered by Convex)
- **Cross-agent** — Works with any MCP client (Claude Code, Cursor, Windsurf, custom agents)
- **Context tool** — One call to get the full picture: active project, pending tasks, recent memories, config, and active cycle
- **Self-hosted** — Run locally with Docker, bring your own Convex deployment
- **Cloud option** — Or just connect to [dodev.ai](https://dodev.ai) for a managed experience (planned)

## Quick Start

> **None of the installation methods below are functional yet.** This section documents the intended setup flow for when the project reaches a usable state.

### Option 1: Cloud (Planned)

1. Sign up at [dodev.ai](https://dodev.ai)
2. Get your API key from the dashboard
3. Add to your MCP client config:

**Claude Code (`~/.claude/claude_code_config.json`):**
```json
{
  "mcpServers": {
    "dodev": {
      "command": "npx",
      "args": ["-y", "@dodev/mcp-server"],
      "env": {
        "DODEV_API_KEY": "your-api-key",
        "DODEV_MODE": "cloud"
      }
    }
  }
}
```

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "dodev": {
      "command": "npx",
      "args": ["-y", "@dodev/mcp-server"],
      "env": {
        "DODEV_API_KEY": "your-api-key",
        "DODEV_MODE": "cloud"
      }
    }
  }
}
```

### Option 2: Self-Hosted (Planned)

1. **Set up Convex** (if you don't have an account):
   ```bash
   npx convex dev  # Creates a free Convex deployment
   ```

2. **Run with Docker:**
   ```bash
   git clone https://github.com/dodotdev/dodev-ai.git
   cd dodev-ai
   cp .env.example .env
   # Edit .env with your Convex URL
   docker compose up -d
   ```

3. **Generate an API key:**
   ```bash
   npx @dodev/mcp-server generate-key
   ```

4. **Configure your MCP client** (same as above, but with `DODEV_MODE=self-hosted`)

### Option 3: Direct npm (Planned)

```bash
npm install -g @dodev/mcp-server
```

Then configure your MCP client to use the installed binary.

## MCP Tools

### Tasks (6)

| Tool | Description |
|------|-------------|
| `create_task` | Create a task with title, priority, severity, project, due date, labels, assignee, estimate, cycle |
| `update_task` | Update any field on a task |
| `complete_task` | Mark a task as done |
| `list_tasks` | List and filter tasks by project, status, priority, severity, search |
| `get_task` | Get details of a specific task |
| `delete_task` | Remove a task |

### Issues (6)

| Tool | Description |
|------|-------------|
| `create_issue` | Create a bug, feature, improvement, or task with severity and priority |
| `update_issue` | Update any field on an issue |
| `close_issue` | Mark an issue as completed |
| `list_issues` | List and filter issues by project, status, type, severity, priority, search |
| `get_issue` | Get details of a specific issue |
| `delete_issue` | Remove an issue |

### Memories (5)

| Tool | Description |
|------|-------------|
| `add_memory` | Store a decision, learning, or context snippet |
| `search_memories` | Full-text search across memories |
| `list_memories` | List recent memories, optionally by project |
| `update_memory` | Update a memory |
| `delete_memory` | Remove a memory |

### Projects (6)

| Tool | Description |
|------|-------------|
| `create_project` | Create a project (auto-provisions workflow statuses, estimate scale) |
| `list_projects` | List projects with optional stats |
| `get_project` | Project details with full config |
| `update_project` | Update project info |
| `archive_project` | Archive a completed project |
| `set_active_project` | Set default project for subsequent calls |

### Config (7)

| Tool | Description |
|------|-------------|
| `update_project_statuses` | Replace all workflow statuses (each maps to a base category) |
| `add_project_label` | Add a colored label |
| `remove_project_label` | Remove a label |
| `add_project_member` | Add a team member |
| `remove_project_member` | Remove a member |
| `update_estimate_scale` | Set estimation scale (points, t-shirt, hours) |
| `update_project_persona` | Set or clear the AI persona for the project |

### Cycles (5)

| Tool | Description |
|------|-------------|
| `create_cycle` | Create a sprint/iteration cycle |
| `list_cycles` | List cycles for a project |
| `get_cycle` | Get cycle details |
| `update_cycle` | Update cycle name, dates, status |
| `delete_cycle` | Delete a cycle |

### Context (2)

| Tool | Description |
|------|-------------|
| `get_context` | Session bootstrapper: active project, pending tasks, recent memories, config, persona, active cycle |
| `get_setup_instructions` | Get tailored CLAUDE.md instructions for configuring AI agents to use dodev.ai proactively |

### Linking (3)

| Tool | Description |
|------|-------------|
| `link_project` | Link a workspace path or git repo to a project for auto-detection. Returns CLAUDE.md setup instructions. |
| `unlink_project` | Remove a workspace or git repo link from a project |
| `update_memory_settings` | Configure memory behavior (auto-capture, default tags, embedding provider) |

See [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) for full parameter specifications.

## CLAUDE.md Integration

dodev.ai works best when AI agents know to use it proactively. The `get_setup_instructions` tool generates a tailored CLAUDE.md section for any project:

```
You: "Set up dodev.ai for this project"
Agent: *calls get_setup_instructions* → gets markdown with session start behavior,
       memory management, task/issue tracking, and project-specific context
Agent: *adds the section to CLAUDE.md* → every future session uses dodev.ai automatically
```

This also happens automatically when you call `link_project` — the response includes setup instructions and a hint to add them to CLAUDE.md.

## Architecture

dodev.ai is a monorepo with three main packages:

```
dodev-ai/
├── apps/web/              # Next.js 15 — landing, docs, dashboard
├── packages/mcp-server/   # MCP server (npm + Docker)
├── packages/convex/       # Convex schema and functions (8 tables, 46 exported functions)
└── packages/shared/       # Shared types (15 interfaces, plan constants, defaults)
```

**Tech stack:** TypeScript, Convex, Next.js 15, WorkOS AuthKit, Stripe, Tailwind CSS v4 + shadcn/ui, Biome, Docker, Turborepo.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document.

## Cloud Pricing (Planned)

> Pricing is not finalized and may change. The cloud service is not yet available.

| | Free | Pro ($10/mo) | Team ($20/mo) |
|---|---|---|---|
| Projects | 1 | Unlimited | Unlimited |
| Tasks | 100 | Unlimited | Unlimited |
| Issues | 200 | Unlimited | Unlimited |
| Memories | 50 | Unlimited | Unlimited |
| Memory search | Full-text | Vector search | Vector search |
| Rate limit | 60/min | 600/min | 2000/min |
| Team members | 1 | 1 | 10 |
| Data retention | 30 days | Unlimited | Unlimited |

Self-hosted is always free and unlimited.

## Development

```bash
# Prerequisites: Node.js 20+, pnpm 10+

# Install dependencies
pnpm install

# Start Convex dev server
pnpm dev:convex

# Start MCP server in dev mode
pnpm dev:mcp

# Start web app
pnpm dev:web

# Start web + Convex together
pnpm dev:all

# Lint and typecheck
pnpm check
pnpm typecheck
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.

## Links

- **Website:** [dodev.ai](https://dodev.ai)
- **Documentation:** [dodev.ai/docs](https://dodev.ai/docs)
- **GitHub:** [github.com/dodotdev/dodev-ai](https://github.com/dodotdev/dodev-ai)
- **npm:** [@dodev/mcp-server](https://www.npmjs.com/package/@dodev/mcp-server)
- **Discord:** [Join our community](https://discord.gg/dodev)
