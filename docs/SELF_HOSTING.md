# Self-Hosting TodoMCP

This guide walks you through running TodoMCP on your own infrastructure. Self-hosted TodoMCP is completely free with no feature limits beyond vector search (which requires an embedding API).

## Prerequisites

- **Docker** and **Docker Compose** (recommended), or **Node.js 20+**
- A free **Convex** account at [convex.dev](https://convex.dev)

## Option A: Docker (Recommended)

### 1. Clone the repository

```bash
git clone https://github.com/dodotdev/todomcp.git
cd todomcp
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
TODOMCP_API_KEY=
```

### 4. Generate an API key

```bash
docker compose run --rm todomcp generate-key
```

This outputs an API key and stores its hash in your Convex database. Add the key to your `.env`:

```env
TODOMCP_API_KEY=tdm_sk_abc123...
```

### 5. Start the server

```bash
docker compose up -d
```

The MCP server is now running. By default it operates in **stdio mode** (for direct MCP client connections). Optionally enable the SSE endpoint on port 3100 for HTTP-based connections.

### 6. Configure your MCP client

**Claude Code:**

```json
// ~/.claude/claude_code_config.json
{
  "mcpServers": {
    "todomcp": {
      "command": "docker",
      "args": ["exec", "-i", "todomcp", "node", "dist/index.js"],
      "env": {
        "TODOMCP_API_KEY": "tdm_sk_abc123..."
      }
    }
  }
}
```

**Or use npx directly** (without Docker):

```json
{
  "mcpServers": {
    "todomcp": {
      "command": "npx",
      "args": ["-y", "@todomcp/mcp-server"],
      "env": {
        "CONVEX_URL": "https://your-deployment-123.convex.cloud",
        "TODOMCP_API_KEY": "tdm_sk_abc123...",
        "TODOMCP_MODE": "self-hosted"
      }
    }
  }
}
```

## Option B: Direct Node.js

If you prefer not to use Docker:

```bash
git clone https://github.com/dodotdev/todomcp.git
cd todomcp
pnpm install
pnpm build

# Set up Convex
cd packages/convex
npx convex deploy
cd ../..

# Generate API key
node packages/mcp-server/dist/cli.js generate-key

# Run
CONVEX_URL=https://... TODOMCP_API_KEY=tdm_sk_... node packages/mcp-server/dist/index.js
```

## Option C: npm global install

```bash
npm install -g @todomcp/mcp-server
todomcp generate-key
todomcp serve
```

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
cd todomcp
git pull
docker compose pull
docker compose up -d
```

Or if using npm:
```bash
npm update -g @todomcp/mcp-server
```

## Data Backup

Your data lives in your Convex deployment. Convex provides:
- Automatic backups
- Point-in-time recovery
- Data export via the Convex dashboard

## Troubleshooting

**"UNAUTHORIZED" errors:**
Regenerate your API key with `todomcp generate-key` and update your `.env` and MCP client config.

**Convex connection issues:**
Verify your `CONVEX_URL` is correct and that your deployment is active at [dashboard.convex.dev](https://dashboard.convex.dev).

**MCP client can't connect:**
Ensure the MCP server process is running. Check logs with `docker compose logs todomcp`.
