import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Clean up MCP logs older than 7 days, every 6 hours
crons.interval("cleanup mcp logs", { hours: 6 }, internal.mcpLogs.cleanup)

// Expire stale agent sessions (no activity for 5 min), every 2 minutes
crons.interval("expire stale agent sessions", { minutes: 2 }, internal.agentSessions.expireStaleSessions)

// Clean up old disconnected/expired agent sessions, every 12 hours
crons.interval("cleanup old agent sessions", { hours: 12 }, internal.agentSessions.cleanup)

export default crons
