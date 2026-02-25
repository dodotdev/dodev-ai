# Self-Hosting dodev.ai

This guide walks you through running dodev.ai on your own infrastructure. Self-hosted dodev.ai is completely free with no feature limits beyond vector search (which requires an embedding API).

## Prerequisites

- **Docker** and **Docker Compose** (recommended), or **Node.js 20+**
- A free **Convex** account at [convex.dev](https://convex.dev)

## Option A: Docker (Recommended)

### 1. Clone the repository

```bash
git clone https://github.com/dodotdev/dodev-ai.git
cd dodev-ai
```

### 2. Set up Convex

Create a free Convex project and deploy the schema:

```bash
npx convex login
npx convex init
npx convex deploy --cmd "cd packages/convex && npx convex deploy"
```

Note the deployment URL (e.g., `https://your-deployment-123.convex.cloud`).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
CONVEX_URL=https://your-deployment-123.convex.cloud

# Generated in step 4
DODEV_API_KEY=
```

### 4. Generate an API key

```bash
docker compose -f docker/docker-compose.yml run --rm dodev generate-key
```

This outputs an API key and stores its hash in your Convex database. Add the key to your `.env`:

```env
DODEV_API_KEY=dodev_sk_abc123...
```

### 5. Start the server

```bash
docker compose -f docker/docker-compose.yml up -d
```

The MCP server is now running. By default it operates in **stdio mode** (for direct MCP client connections). Optionally enable the Streamable HTTP endpoint on port 3100 for HTTP-based connections.

### 6. Configure your MCP client

**Claude Code:**

```json
// ~/.claude/claude_code_config.json
{
  "mcpServers": {
    "dodev": {
      "command": "docker",
      "args": ["exec", "-i", "dodev", "node", "dist/index.js"],
      "env": {
        "DODEV_API_KEY": "dodev_sk_abc123..."
      }
    }
  }
}
```

**Or use npx directly** (without Docker):

```json
{
  "mcpServers": {
    "dodev": {
      "command": "npx",
      "args": ["-y", "@dodev/mcp-server"],
      "env": {
        "CONVEX_URL": "https://your-deployment-123.convex.cloud",
        "DODEV_API_KEY": "dodev_sk_abc123...",
        "DODEV_MODE": "self-hosted"
      }
    }
  }
}
```

## Option B: Direct Node.js

If you prefer not to use Docker:

```bash
git clone https://github.com/dodotdev/dodev-ai.git
cd dodev-ai
pnpm install
pnpm build

# Set up Convex
cd packages/convex
npx convex deploy
cd ../..

# Generate API key
node packages/mcp-server/dist/cli.js generate-key

# Run
CONVEX_URL=https://... DODEV_API_KEY=dodev_sk_... node packages/mcp-server/dist/index.js
```

## Option C: npm global install

```bash
npm install -g @dodev/mcp-server
dodev generate-key
dodev serve
```

## CLAUDE.md Setup

For AI agents to use dodev.ai proactively in every session, add usage instructions to your project's `CLAUDE.md`.

### Automatic (Recommended)

After linking your project, ask the agent:

```
"Get the dodev.ai setup instructions and add them to CLAUDE.md"
```

The agent will call `get_setup_instructions`, which returns a tailored markdown section, and add it to your `CLAUDE.md`.

This also happens automatically when you call `link_project` — the response includes `setupInstructions` and a hint for the agent to add them.

### Manual

Add the following to your project's `CLAUDE.md`:

```markdown
## dodev.ai Usage (MANDATORY)

This project has a connected dodev.ai MCP server. You MUST use it proactively:

### Session Start
- **Always** call `get_context` at the beginning of every session.
- **Always** call `search_memories` before starting any non-trivial task.

### During Work
- **Store memories** via `add_memory` for codebase facts, decisions, preferences, and gotchas.
- **Create todos** via `create_todo` for follow-up work.
- **Create issues** via `create_issue` for bugs found during development.
- **Update todos/issues** as you work — mark them `in_progress` when starting, `completed` when done.
```

Replace the generic section with output from `get_setup_instructions` to include project-specific context (name, stub, ID).

## Enabling Vector Search (Optional)

By default, memory search uses Convex full-text search. For semantic/vector search, you need an embedding provider:

```env
# .env
EMBEDDING_PROVIDER=openai  # or "voyage", "cohere"
OPENAI_API_KEY=sk-...      # Your embedding API key
```

With vector search enabled, `search_memories` will use cosine similarity for more intelligent matching.

## Updating

```bash
cd dodev-ai
git pull
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up -d
```

Or if using npm:
```bash
npm update -g @dodev/mcp-server
```

## Data Backup

Your data lives in your Convex deployment. Convex provides:
- Automatic backups
- Point-in-time recovery
- Data export via the Convex dashboard

## Troubleshooting

**"UNAUTHORIZED" errors:**
Regenerate your API key with `dodev generate-key` and update your `.env` and MCP client config.

**Convex connection issues:**
Verify your `CONVEX_URL` is correct and that your deployment is active at [dashboard.convex.dev](https://dashboard.convex.dev).

**MCP client can't connect:**
Ensure the MCP server process is running. Check logs with `docker compose -f docker/docker-compose.yml logs dodev`.
