#!/usr/bin/env node
import { generateApiKey, hashApiKey } from "./auth/api-key.js"
import { api, getConvexClient } from "./convex-client.js"

const command = process.argv[2]

async function main() {
  switch (command) {
    case "generate-key":
      await handleGenerateKey()
      break

    case "serve":
      // Import and run the main server
      await import("./index.js")
      break

    default:
      console.log(`DoMCP CLI

Usage:
  domcp generate-key    Generate a new API key
  domcp serve           Start the MCP server

Environment variables:
  CONVEX_URL              Your Convex deployment URL (required)
  DOMCP_API_KEY           Your API key (required for serve)
  DOMCP_MODE              "self-hosted" (default) or "cloud"
`)
      break
  }
}

async function handleGenerateKey() {
  if (!process.env.CONVEX_URL) {
    console.error("Error: CONVEX_URL environment variable is required")
    console.error(
      "Set it to your Convex deployment URL (e.g., https://your-deployment.convex.cloud)"
    )
    process.exit(1)
  }

  const apiKey = generateApiKey()
  const apiKeyHash = hashApiKey(apiKey)

  console.log("\nGenerating new DoMCP API key...\n")

  try {
    const client = getConvexClient()
    await client.mutation(api.users.createFromApiKey, {
      workosUserId: "self-hosted",
      email: "self-hosted@domcp.local",
      apiKey,
      apiKeyHash,
    })

    console.log("API key generated and stored in Convex.\n")
    console.log(`  DOMCP_API_KEY=${apiKey}\n`)
    console.log("Add this to your .env file or MCP client configuration.")
    console.log("Keep this key secret — it cannot be retrieved again.\n")
  } catch (error) {
    console.error("Failed to store API key in Convex:", error)
    console.error("\nThe key was generated but not stored. You can manually add it:")
    console.log(`  API Key: ${apiKey}`)
    console.log(`  Hash:    ${apiKeyHash}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
