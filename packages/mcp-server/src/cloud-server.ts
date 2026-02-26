import { randomUUID } from "node:crypto"
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js"
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import express from "express"
import { createServer } from "./server.js"
import { WorkOSOAuthProvider, handleAuthCallback, resolveApiKeyHash } from "./auth/workos-oauth-provider.js"
import { runWithAuthContext } from "./auth/auth-context.js"
import { api, getConvexClient } from "./convex-client.js"

function getBaseUrl(): string {
  const url = process.env.DODEV_BASE_URL
  if (!url) throw new Error("DODEV_BASE_URL environment variable is required")
  return url
}

/**
 * Start the cloud MCP server with OAuth 2.1 authentication
 * via WorkOS AuthKit and Streamable HTTP transport.
 */
export async function startCloudServer(): Promise<void> {
  const baseUrl = getBaseUrl()
  const port = parseInt(process.env.PORT ?? "3100", 10)

  const provider = new WorkOSOAuthProvider()

  const app = express()

  // Trust proxy for running behind a reverse proxy (Railway, Fly, etc.)
  app.set("trust proxy", 1)

  // --- OAuth routes (/.well-known, /authorize, /token, /register) ---
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(baseUrl),
      serviceDocumentationUrl: new URL("https://dodev.ai/docs"),
    })
  )

  // --- Auth callback route (receives signed token from web app) ---
  app.get("/callback", (req, res) => {
    handleAuthCallback(req as any, res).catch((err) => {
      console.error("Callback handler error:", err)
      res.status(500).json({ error: "Internal server error" })
    })
  })

  // --- Health check ---
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", mode: "cloud" })
  })

  // --- MCP endpoint (authenticated) ---
  const bearerAuth = requireBearerAuth({ verifier: provider })

  // Track active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>()
  // Track apiKeyHash per session for disconnect cleanup
  const sessionApiKeys = new Map<string, string>()

  app.all("/mcp", bearerAuth, async (req, res) => {
    const authInfo = req.auth
    if (!authInfo) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    const workosUserId = authInfo.extra?.workosUserId as string
    if (!workosUserId) {
      res.status(401).json({ error: "Invalid token: missing user ID" })
      return
    }

    try {
      // Resolve apiKeyHash for this user so existing tool handlers work unchanged
      const apiKeyHash = await resolveApiKeyHash(workosUserId)

      // Check for existing session
      const existingSessionId = req.headers["mcp-session-id"] as string | undefined

      if (existingSessionId && transports.has(existingSessionId)) {
        // Existing session — reuse transport within auth context
        await runWithAuthContext({
          apiKeyHash,
          workosUserId,
          transportSessionId: existingSessionId,
          oauthClientId: authInfo.clientId,
        }, async () => {
          const transport = transports.get(existingSessionId)!
          await transport.handleRequest(req, res)
        })
        return
      }

      if (existingSessionId && !transports.has(existingSessionId)) {
        // Unknown session ID — reject
        res.status(404).json({ error: "Session not found" })
        return
      }

      // New session — create transport and server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      })

      const server = createServer()
      await server.connect(transport)

      // Clean up on explicit close
      transport.onclose = () => {
        const sid = transport.sessionId
        if (sid) {
          transports.delete(sid)

          // Mark agent session as disconnected in Convex
          const storedApiKeyHash = sessionApiKeys.get(sid)
          if (storedApiKeyHash) {
            sessionApiKeys.delete(sid)
            const convex = getConvexClient()
            convex
              .mutation(api.agentSessions.disconnect, {
                apiKeyHash: storedApiKeyHash,
                sessionId: sid,
              })
              .catch((err: unknown) =>
                console.error("Failed to disconnect agent session:", err)
              )
          }
        }
        server.close().catch(() => {})
      }

      // handleRequest generates the session ID on first call
      // Run within auth context so tool handlers can access session info
      await runWithAuthContext({
        apiKeyHash,
        workosUserId,
        oauthClientId: authInfo.clientId,
      }, async () => {
        await transport.handleRequest(req, res)
      })

      // Store transport AFTER handleRequest so sessionId is available
      if (transport.sessionId && !transports.has(transport.sessionId)) {
        transports.set(transport.sessionId, transport)
        sessionApiKeys.set(transport.sessionId, apiKeyHash)

        // Register agent session in Convex
        const clientInfo = provider.clientsStore.getClient(authInfo.clientId)
        const convex = getConvexClient()
        convex
          .mutation(api.agentSessions.connect, {
            apiKeyHash,
            sessionId: transport.sessionId,
            clientId: authInfo.clientId,
            clientName: clientInfo?.client_name,
          })
          .catch((err: unknown) =>
            console.error("Failed to create agent session:", err)
          )
      }
    } catch (error) {
      console.error("MCP request error:", error)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      }
    }
  })

  app.listen(port, "0.0.0.0", () => {
    console.error(`dodev.ai cloud server started on port ${port}`)
    console.error(`  Base URL: ${baseUrl}`)
    console.error(`  MCP endpoint: ${baseUrl}/mcp`)
    console.error(`  OAuth: ${baseUrl}/.well-known/oauth-authorization-server`)
  })
}
