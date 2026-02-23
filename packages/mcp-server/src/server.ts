import { createRequire } from "module"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { configTools, handleConfigTool } from "./tools/config.js"
import { contextTools, handleContextTool } from "./tools/context.js"
import { cycleTools, handleCycleTool } from "./tools/cycles.js"
import { handleMemoryTool, memoryTools } from "./tools/memories.js"
import { handleProjectTool, projectTools } from "./tools/projects.js"
import { handleIssueTool, issueTools } from "./tools/issues.js"
import { handleTodoTool, todoTools } from "./tools/todos.js"

const require = createRequire(import.meta.url)
const { version } = require("../../package.json") as { version: string }

const allTools = [
  ...todoTools,
  ...issueTools,
  ...memoryTools,
  ...projectTools,
  ...contextTools,
  ...configTools,
  ...cycleTools,
]

const todoToolNames = new Set(todoTools.map((t) => t.name))
const issueToolNames = new Set(issueTools.map((t) => t.name))
const memoryToolNames = new Set(memoryTools.map((t) => t.name))
const projectToolNames = new Set(projectTools.map((t) => t.name))
const contextToolNames = new Set(contextTools.map((t) => t.name))
const configToolNames = new Set(configTools.map((t) => t.name))
const cycleToolNames = new Set(cycleTools.map((t) => t.name))

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

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const toolArgs = (args ?? {}) as Record<string, unknown>

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
      } else {
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
