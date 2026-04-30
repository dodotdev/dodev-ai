import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const recommendTools: Tool[] = [
  {
    name: "recommend",
    description:
      "Suggest the next best work to do, ranked with rationale. Combines: open critical/major issues, in-progress tasks, near-complete umbrellas (close it out), urgent/high pending tasks, debt-trend warnings (open issues growing), trivial-severity quick wins, plus a +50 boost for items named in the latest handover's nextSteps. Prefer this over list_tasks when answering 'what should I work on?'. Each recommendation has a category, score, and human-readable reason; render the reason so the user can see why each item surfaced.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description: "Scope to a specific space.",
        },
        projectId: {
          type: "string",
          description: "Scope to a specific project (wins over spaceId).",
        },
        count: {
          type: "number",
          description: "Max recommendations (1-10). Default: 5.",
        },
      },
    },
  },
]

export async function handleRecommendTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "recommend":
      return await client.query(api.recommend.recommend, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        count: args.count as number | undefined,
      })

    default:
      throw new Error(`Unknown recommend tool: ${name}`)
  }
}
