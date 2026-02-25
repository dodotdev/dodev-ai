import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { createRequire } from "module"
import { getApiKeyHash } from "./auth/api-key.js"
import { api, getConvexClient } from "./convex-client.js"
import { attachmentTools, handleAttachmentTool } from "./tools/attachments.js"
import { commentTools, handleCommentTool } from "./tools/comments.js"
import { configTools, handleConfigTool } from "./tools/config.js"
import { contextTools, handleContextTool } from "./tools/context.js"
import { cycleTools, handleCycleTool } from "./tools/cycles.js"
import { handleIssueTool, issueTools } from "./tools/issues.js"
import { handleLinkingTool, linkingTools } from "./tools/linking.js"
import { handleMemoryTool, memoryTools } from "./tools/memories.js"
import { handleProjectTool, projectTools } from "./tools/projects.js"
import { handleTodoTool, todoTools } from "./tools/todos.js"

const require = createRequire(import.meta.url)
const { version } = require("../package.json") as { version: string }

const allTools = [
  ...todoTools,
  ...issueTools,
  ...memoryTools,
  ...projectTools,
  ...contextTools,
  ...configTools,
  ...cycleTools,
  ...linkingTools,
  ...attachmentTools,
  ...commentTools,
]

const todoToolNames = new Set(todoTools.map((t) => t.name))
const issueToolNames = new Set(issueTools.map((t) => t.name))
const memoryToolNames = new Set(memoryTools.map((t) => t.name))
const projectToolNames = new Set(projectTools.map((t) => t.name))
const contextToolNames = new Set(contextTools.map((t) => t.name))
const configToolNames = new Set(configTools.map((t) => t.name))
const cycleToolNames = new Set(cycleTools.map((t) => t.name))
const linkingToolNames = new Set(linkingTools.map((t) => t.name))
const attachmentToolNames = new Set(attachmentTools.map((t) => t.name))
const commentToolNames = new Set(commentTools.map((t) => t.name))

/** Strip sensitive fields and return loggable args */
function sanitizeArgs(toolArgs: Record<string, unknown>): Record<string, unknown> {
  const { apiKeyHash: _, ...safe } = toolArgs
  return safe
}

/** Fire-and-forget log write to Convex */
function writeLog(
  tool: string,
  args: Record<string, unknown>,
  status: "ok" | "error",
  durationMs: number,
  errorCode?: string,
  errorMessage?: string
) {
  try {
    const apiKeyHash = getApiKeyHash()
    const client = getConvexClient()
    const projectId = (args.projectId as string) || undefined
    client
      .mutation(api.mcpLogs.write, {
        apiKeyHash,
        tool,
        args: sanitizeArgs(args),
        status,
        durationMs,
        projectId,
        errorCode,
        errorMessage,
      })
      .catch(() => {
        // Silently ignore log write failures — never block tool responses
      })
  } catch {
    // API key or client not available — skip logging
  }
}

export function createServer(): Server {
  const server = new Server(
    {
      name: "domcp",
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools }
  })

  const isDev = process.env.NODE_ENV !== "production"

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const toolArgs = (args ?? {}) as Record<string, unknown>

    if (isDev) {
      const safe = sanitizeArgs(toolArgs)
      const argStr = Object.keys(safe).length > 0 ? ` ${JSON.stringify(safe)}` : ""
      console.error(`[MCP] ${name}${argStr}`)
    }

    // Fix array parameters that may arrive as JSON strings from some MCP clients
    for (const key of ["tags", "labelIds"]) {
      const val = toolArgs[key]
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) {
            toolArgs[key] = parsed
          }
        } catch {
          // Not valid JSON — leave as-is
        }
      }
    }

    const start = Date.now()

    try {
      let result: unknown

      if (todoToolNames.has(name)) {
        result = await handleTodoTool(name, toolArgs)
      } else if (issueToolNames.has(name)) {
        result = await handleIssueTool(name, toolArgs)
      } else if (memoryToolNames.has(name)) {
        result = await handleMemoryTool(name, toolArgs)
      } else if (projectToolNames.has(name)) {
        result = await handleProjectTool(name, toolArgs)
      } else if (contextToolNames.has(name)) {
        result = await handleContextTool(name, toolArgs)
      } else if (configToolNames.has(name)) {
        result = await handleConfigTool(name, toolArgs)
      } else if (cycleToolNames.has(name)) {
        result = await handleCycleTool(name, toolArgs)
      } else if (linkingToolNames.has(name)) {
        result = await handleLinkingTool(name, toolArgs)
      } else if (attachmentToolNames.has(name)) {
        result = await handleAttachmentTool(name, toolArgs)
      } else if (commentToolNames.has(name)) {
        result = await handleCommentTool(name, toolArgs)
      } else {
        if (isDev) console.error(`[MCP] ${name} → NOT_FOUND`)
        writeLog(name, toolArgs, "error", Date.now() - start, "NOT_FOUND")
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: { code: "NOT_FOUND", message: `Unknown tool: ${name}` },
              }),
            },
          ],
          isError: true,
        }
      }

      const duration = Date.now() - start
      if (isDev) console.error(`[MCP] ${name} → OK (${duration}ms)`)
      writeLog(name, toolArgs, "ok", duration)

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      // Map Convex errors to MCP error responses
      let code = "INTERNAL_ERROR"
      if (message === "UNAUTHORIZED") code = "UNAUTHORIZED"
      else if (message === "NOT_FOUND") code = "NOT_FOUND"
      else if (message === "QUOTA_EXCEEDED") code = "QUOTA_EXCEEDED"
      else if (message === "RATE_LIMITED") code = "RATE_LIMITED"

      const duration = Date.now() - start
      if (isDev) console.error(`[MCP] ${name} → ${code}: ${message} (${duration}ms)`)
      writeLog(name, toolArgs, "error", duration, code, message)

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: { code, message } }),
          },
        ],
        isError: true,
      }
    }
  })

  return server
}
