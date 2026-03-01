import { randomUUID } from "node:crypto"
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js"
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import express from "express"
import { runWithAuthContext } from "./auth/auth-context.js"
import {
  handleAuthCallback,
  resolveApiKeyHash,
  WorkOSOAuthProvider,
} from "./auth/workos-oauth-provider.js"
import { api, getConvexClient } from "./convex-client.js"
import { createServer } from "./server.js"

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

  // --- Status endpoint (shows session counts for monitoring) ---
  app.get("/status", (_req, res) => {
    res.json({
      status: "ok",
      mode: "cloud",
      activeSessions: transports.size,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    })
  })

  // --- MCP endpoint (authenticated) ---
  const bearerAuth = requireBearerAuth({ verifier: provider })

  // Track active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>()
  // Track apiKeyHash per session for disconnect cleanup
  const sessionApiKeys = new Map<string, string>()
  // Track last activity time per session for idle cleanup
  const sessionLastActivity = new Map<string, number>()

  // Max sessions per container — safety valve to prevent unbounded memory growth
  const MAX_SESSIONS = 200
  // How long an idle session stays alive before being reaped
  const SESSION_IDLE_TTL_MS = 30 * 60 * 1000 // 30 minutes

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
        sessionLastActivity.set(existingSessionId, Date.now())
        await runWithAuthContext(
          {
            apiKeyHash,
            workosUserId,
            transportSessionId: existingSessionId,
            oauthClientId: authInfo.clientId,
          },
          async () => {
            const transport = transports.get(existingSessionId)!
            await transport.handleRequest(req, res)
          }
        )
        return
      }

      if (existingSessionId && !transports.has(existingSessionId)) {
        // Session lost (container restart, deploy, etc.)
        // Return 404 per MCP spec so the client re-initializes the session
        // WITHOUT re-authenticating (the bearer token is still valid).
        console.error(
          `[mcp] Session not found: ${existingSessionId} (active sessions: ${transports.size}). Returning 404 so client re-initializes for user ${workosUserId}.`
        )
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
          id: null,
        })
        return
      }

      // New session (no existing session ID) — create transport and server
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
          sessionLastActivity.delete(sid)

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
              .catch((err: unknown) => console.error("Failed to disconnect agent session:", err))
          }
        }
        server.close().catch(() => {})
      }

      // handleRequest generates the session ID on first call
      // Run within auth context so tool handlers can access session info
      await runWithAuthContext(
        {
          apiKeyHash,
          workosUserId,
          oauthClientId: authInfo.clientId,
        },
        async () => {
          await transport.handleRequest(req, res)
        }
      )

      // Store transport AFTER handleRequest so sessionId is available
      if (transport.sessionId && !transports.has(transport.sessionId)) {
        // Enforce max session cap — evict oldest idle session if at limit
        if (transports.size >= MAX_SESSIONS) {
          let oldestSid: string | null = null
          let oldestTime = Infinity
          for (const [sid, lastActive] of sessionLastActivity) {
            if (lastActive < oldestTime) {
              oldestTime = lastActive
              oldestSid = sid
            }
          }
          if (oldestSid) {
            console.error(`[mcp] Max sessions (${MAX_SESSIONS}) reached — evicting oldest idle session: ${oldestSid}`)
            const evicted = transports.get(oldestSid)
            transports.delete(oldestSid)
            sessionLastActivity.delete(oldestSid)
            const evictedApiKey = sessionApiKeys.get(oldestSid)
            sessionApiKeys.delete(oldestSid)
            if (evicted) {
              evicted.close?.().catch(() => {})
            }
            if (evictedApiKey) {
              const convex = getConvexClient()
              convex
                .mutation(api.agentSessions.disconnect, {
                  apiKeyHash: evictedApiKey,
                  sessionId: oldestSid,
                })
                .catch(() => {})
            }
          }
        }

        transports.set(transport.sessionId, transport)
        sessionApiKeys.set(transport.sessionId, apiKeyHash)
        sessionLastActivity.set(transport.sessionId, Date.now())
        console.error(
          `[mcp] New session created: ${transport.sessionId} for user ${workosUserId} (active sessions: ${transports.size})`
        )

        // Register agent session in Convex
        const clientInfo = await provider.clientsStore.getClient(authInfo.clientId)
        const convex = getConvexClient()
        convex
          .mutation(api.agentSessions.connect, {
            apiKeyHash,
            sessionId: transport.sessionId,
            clientId: authInfo.clientId,
            clientName: clientInfo?.client_name,
          })
          .catch((err: unknown) => console.error("Failed to create agent session:", err))
      }
    } catch (error) {
      console.error("MCP request error:", error)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      }
    }
  })

  // Periodic idle session reaper — cleans up sessions that have had no activity.
  // This prevents unbounded memory growth when clients silently disconnect (e.g., close
  // VS Code, switch tabs) without sending an explicit close. Previously these zombie
  // sessions accumulated forever, causing OOM after ~1.5 days.
  const REAPER_INTERVAL_MS = 5 * 60 * 1000 // Check every 5 minutes
  setInterval(() => {
    const now = Date.now()
    let reaped = 0
    for (const [sid, lastActive] of sessionLastActivity) {
      if (now - lastActive > SESSION_IDLE_TTL_MS) {
        const transport = transports.get(sid)
        transports.delete(sid)
        sessionLastActivity.delete(sid)
        const apiKeyHash = sessionApiKeys.get(sid)
        sessionApiKeys.delete(sid)

        // Close the transport and MCP server cleanly
        if (transport) {
          transport.close?.().catch(() => {})
        }

        // Mark as disconnected in Convex
        if (apiKeyHash) {
          const convex = getConvexClient()
          convex
            .mutation(api.agentSessions.disconnect, {
              apiKeyHash,
              sessionId: sid,
            })
            .catch(() => {})
        }
        reaped++
      }
    }
    if (reaped > 0) {
      console.error(`[mcp] Reaped ${reaped} idle sessions (remaining: ${transports.size})`)
    }
  }, REAPER_INTERVAL_MS)

  // Periodic heartbeat to keep active sessions alive in Convex
  // (the expireStaleSessions cron marks sessions expired after 30 min without activity)
  // Only heartbeat sessions that have had recent activity — no point keeping zombies alive.
  const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
  setInterval(() => {
    const now = Date.now()
    const convex = getConvexClient()
    for (const [sid, apiKeyHash] of sessionApiKeys) {
      const lastActive = sessionLastActivity.get(sid)
      // Only heartbeat sessions active in the last 15 minutes
      if (lastActive && now - lastActive < 15 * 60 * 1000) {
        convex
          .mutation(api.agentSessions.heartbeat, {
            apiKeyHash,
            sessionId: sid,
          })
          .catch(() => {
            // Session may have been cleaned up — remove from tracking
            sessionApiKeys.delete(sid)
            sessionLastActivity.delete(sid)
            transports.delete(sid)
          })
      }
    }
  }, HEARTBEAT_INTERVAL_MS)

  app.listen(port, "0.0.0.0", () => {
    console.error(`dodev.ai cloud server started on port ${port}`)
    console.error(`  Base URL: ${baseUrl}`)
    console.error(`  MCP endpoint: ${baseUrl}/mcp`)
    console.error(`  OAuth: ${baseUrl}/.well-known/oauth-authorization-server`)
  })
}
