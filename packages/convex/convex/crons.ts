import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Clean up MCP logs older than 7 days, every 6 hours
crons.interval("cleanup mcp logs", { hours: 6 }, internal.mcpLogs.cleanup)

// Expire stale agent sessions (no activity for 30 min), every 10 minutes
crons.interval(
  "expire stale agent sessions",
  { minutes: 10 },
  internal.agentSessions.expireStaleSessions
)

// Clean up old disconnected/expired agent sessions, every 12 hours
crons.interval("cleanup old agent sessions", { hours: 12 }, internal.agentSessions.cleanup)

// Clean up old OAuth client registrations (60+ days), every 24 hours
crons.interval("cleanup old oauth clients", { hours: 24 }, internal.oauthClients.cleanup)

export default crons
