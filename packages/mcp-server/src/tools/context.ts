import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const contextTools: Tool[] = [
  {
    name: "get_context",
    description:
      "CALL THIS FIRST at the start of every session. Returns everything you need to get oriented: active project, pending todos, recent memories, project list, project config (workflow statuses, labels, members, estimate scale), AI persona instructions, and active cycle. This is your primary way to load context from previous sessions — it includes the most relevant stored memories so you can pick up where you or another agent left off.",
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
