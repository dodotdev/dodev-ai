import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Clean up MCP logs older than 7 days, every 6 hours
crons.interval("cleanup mcp logs", { hours: 6 }, internal.mcpLogs.cleanup)

export default crons
