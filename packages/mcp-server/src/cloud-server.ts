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

  // --- MCP endpoint (authenticated) ---
  const bearerAuth = requireBearerAuth({ verifier: provider })

  // --- Status endpoint (admin-only, protected by DODEV_JWT_SECRET as query param) ---
  // Usage: GET /status?key=<DODEV_JWT_SECRET>
  app.get("/status", async (req, res) => {
    try {
      const key = req.query.key as string | undefined
      const secret = process.env.DODEV_JWT_SECRET
      if (!key || !secret || key !== secret) {
        res.status(403).json({ error: "Forbidden" })
        return
      }

      // Resolve user names for the per-user breakdown
      const convex = getConvexClient()
      const sessionsPerUser: Record<string, { name: string; email: string; sessions: number }> = {}
      for (const [userId, sessions] of userSessions) {
        const u = await convex.query(api.users.getByWorkosId, { workosUserId: userId })
        sessionsPerUser[userId] = {
          name: u?.name ?? "Unknown",
          email: u?.email ?? "Unknown",
          sessions: sessions.size,
        }
      }

      const data = {
        status: "ok",
        mode: "cloud",
        activeSessions: transports.size,
        activeUsers: userSessions.size,
        sessionsPerUser,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      }

      // Return auto-refreshing HTML page with pretty-printed JSON
      // Data is server-rendered into a <pre> tag as escaped text — no client-side injection
      const jsonPretty = JSON.stringify(data, null, 2)
      const escaped = jsonPretty.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      res.setHeader("Content-Type", "text/html")
      res.send(`<!DOCTYPE html>
<html>
<head>
  <title>dodev.ai - Server Status</title>
  <meta http-equiv="refresh" content="15">
  <style>
    body { background: #ffffff; color: #1a1a1a; font-family: ui-monospace, monospace; padding: 2rem; margin: 0; }
    h1 { font-size: 1.2rem; color: #059669; margin: 0 0 0.25rem; }
    .subtitle { color: #6b7280; font-size: 0.8rem; margin-bottom: 1.5rem; }
    pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>dodev.ai server status</h1>
  <div class="subtitle">Auto-refreshes every 15 seconds</div>
  <pre>${escaped}</pre>
</body>
</html>`)
    } catch (error) {
      console.error("Status endpoint error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  // Track active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>()
  // Track apiKeyHash per session for disconnect cleanup
  const sessionApiKeys = new Map<string, string>()
  // Track last activity time per session for idle cleanup
  const sessionLastActivity = new Map<string, number>()
  // Track sessions per user for per-user limits (workosUserId → Set of sessionIds)
  const userSessions = new Map<string, Set<string>>()
  // Track active session per agentId — when the same agent reconnects, evict the old session
  // This is the key dedup mechanism for clients like Cursor configured globally
  const agentSessionMap = new Map<string, string>() // agentId → sessionId

  // Max sessions per container — safety valve to prevent unbounded memory growth
  const MAX_SESSIONS = 200
  // Max sessions per user — prevents a single misbehaving client from leaking sessions
  const MAX_SESSIONS_PER_USER = 3
  // How long an idle session stays alive before being reaped
  const SESSION_IDLE_TTL_MS = 30 * 60 * 1000 // 30 minutes

  /** Evict a single session by ID, cleaning up all tracking maps. */
  function evictSession(sid: string): void {
    const transport = transports.get(sid)
    transports.delete(sid)
    sessionLastActivity.delete(sid)
    const apiKeyHash = sessionApiKeys.get(sid)
    sessionApiKeys.delete(sid)

    // Remove from user tracking
    for (const [, sessions] of userSessions) {
      sessions.delete(sid)
    }

    // Remove from agentId tracking
    for (const [agentId, sessionId] of agentSessionMap) {
      if (sessionId === sid) {
        agentSessionMap.delete(agentId)
        break
      }
    }

    if (transport) {
      transport.close?.().catch(() => {})
    }
    if (apiKeyHash) {
      const convex = getConvexClient()
      convex
        .mutation(api.agentSessions.disconnect, {
          apiKeyHash,
          sessionId: sid,
        })
        .catch(() => {})
    }
  }

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
          evictSession(sid)
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
        const agentId = authInfo.extra?.agentId as string | undefined

        // Primary dedup: if this agentId already has an active session, evict it.
        // This is the key fix for Cursor configured globally — every reconnect from
        // the same agent (same OAuth token) replaces the old session instantly instead
        // of accumulating zombie sessions.
        if (agentId) {
          const existingSid = agentSessionMap.get(agentId)
          if (existingSid && existingSid !== transport.sessionId) {
            console.error(
              `[mcp] Agent ${agentId} reconnected — evicting old session ${existingSid}`
            )
            evictSession(existingSid)
          }
        }

        // Enforce per-user session limit — evict oldest sessions for this user
        const userSessionSet = userSessions.get(workosUserId) ?? new Set()
        if (userSessionSet.size >= MAX_SESSIONS_PER_USER) {
          const userSids = [...userSessionSet]
          const sorted = userSids.sort((a, b) => {
            return (sessionLastActivity.get(a) ?? 0) - (sessionLastActivity.get(b) ?? 0)
          })
          const toEvict = sorted.slice(0, userSessionSet.size - MAX_SESSIONS_PER_USER + 1)
          for (const sid of toEvict) {
            console.error(
              `[mcp] Per-user limit (${MAX_SESSIONS_PER_USER}) — evicting old session ${sid} for user ${workosUserId}`
            )
            evictSession(sid)
          }
        }

        // Enforce global max session cap
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
            console.error(
              `[mcp] Global max sessions (${MAX_SESSIONS}) — evicting oldest: ${oldestSid}`
            )
            evictSession(oldestSid)
          }
        }

        transports.set(transport.sessionId, transport)
        sessionApiKeys.set(transport.sessionId, apiKeyHash)
        sessionLastActivity.set(transport.sessionId, Date.now())

        // Track in per-user map
        if (!userSessions.has(workosUserId)) {
          userSessions.set(workosUserId, new Set())
        }
        userSessions.get(workosUserId)!.add(transport.sessionId)

        // Track in agentId map
        if (agentId) {
          agentSessionMap.set(agentId, transport.sessionId)
        }

        console.error(
          `[mcp] New session created: ${transport.sessionId} for user ${workosUserId} (user sessions: ${userSessions.get(workosUserId)!.size}, total: ${transports.size})`
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
            agentId,
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
        evictSession(sid)
        reaped++
      }
    }
    // Clean up empty user session sets
    for (const [userId, sessions] of userSessions) {
      if (sessions.size === 0) userSessions.delete(userId)
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
            evictSession(sid)
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
