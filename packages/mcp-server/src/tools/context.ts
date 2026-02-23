import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const contextTools: Tool[] = [
  {
    name: "get_context",
    description:
      "Get a comprehensive summary of the current state. Designed to be called once at the start of an agent session to provide full context: active project, pending todos, recent memories, project list, project config (workflow statuses, labels, members, estimate scale), AI persona system prompt, and active cycle.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Get context for a specific project (or active project)",
        },
        todoLimit: {
          type: "number",
          description: "Max pending todos to return. Default: 10",
        },
        memoryLimit: {
          type: "number",
          description: "Max recent memories to return. Default: 5",
        },
      },
    },
  },
]

export async function handleContextTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "get_context":
      return await client.query(api.projects.getContext, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        todoLimit: args.todoLimit as number | undefined,
        memoryLimit: args.memoryLimit as number | undefined,
      })

    default:
      throw new Error(`Unknown context tool: ${name}`)
  }
}
