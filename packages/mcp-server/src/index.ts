#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createServer } from "./server.js"

async function main() {
  const mode = process.env.DODEV_MODE ?? "self-hosted"

  if (mode === "cloud") {
    // Streamable HTTP transport for cloud mode (Phase 3)
    console.error("Cloud mode (Streamable HTTP) is not yet implemented. Use self-hosted mode.")
    process.exit(1)
  }

  // Default: stdio transport for local MCP clients
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)
  console.error("dodev.ai server started (stdio mode)")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
