import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const snapshotTools: Tool[] = [
  {
    name: "take_snapshot",
    description:
      "Freeze the current state of a space or project (task counts, issue severities, memory totals, per-task/issue status). Used as a baseline for recap() to compute 'what changed since last session.' Call this at the END of a session, before context compaction (PreCompact hook), or whenever you want a clean baseline. Snapshots are capped at 20 per scope; oldest are pruned automatically.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description: "The space to snapshot. Provide either this or projectId (not both).",
        },
        projectId: {
          type: "string",
          description:
            "The project to snapshot. Project snapshots are independent of the parent space's snapshots.",
        },
        gitHead: {
          type: "string",
          description:
            "Optional git HEAD SHA at snapshot time. Captured by hooks; the agent typically doesn't need to pass this manually.",
        },
        trigger: {
          type: "string",
          enum: ["manual", "pre_compact", "session_end"],
          description: "What caused this snapshot. Default: manual.",
        },
      },
    },
  },
  {
    name: "recap",
    description:
      "Compute what changed since the last snapshot in a scope: tasks added/closed/status-changed, issues opened/resolved/severity-changed, memories added/deprecated, and issue-debt growth. Returns both structured data and a markdown rendering. Call this AT SESSION START (alongside get_context) to ground yourself in what happened since you last touched this scope. If no prior snapshot exists, returns hasBaseline=false.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "Scope: a space." },
        projectId: { type: "string", description: "Scope: a project (wins over spaceId)." },
        sinceSnapshotId: {
          type: "string",
          description:
            "Diff against a specific snapshot. Defaults to the latest snapshot in the scope.",
        },
        markdown: {
          type: "boolean",
          description:
            "Include the markdown rendering. Default: true. Set false if you only need the structured data.",
        },
      },
    },
  },
  {
    name: "list_snapshots",
    description:
      "List recent snapshots in a scope, newest first. Use this to find a specific historical baseline to diff against (pass its _id as sinceSnapshotId on recap).",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string" },
        projectId: { type: "string" },
        limit: { type: "number", description: "Max results (1-20). Default: 20." },
      },
    },
  },
]

export async function handleSnapshotTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "take_snapshot":
      return await client.mutation(api.snapshots.take, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        gitHead: args.gitHead as string | undefined,
        trigger: args.trigger as "manual" | "pre_compact" | "session_end" | undefined,
      })

    case "recap":
      return await client.query(api.snapshots.recap, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        sinceSnapshotId: args.sinceSnapshotId as string | undefined,
        markdown: args.markdown as boolean | undefined,
      })

    case "list_snapshots":
      return await client.query(api.snapshots.list, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        limit: args.limit as number | undefined,
      })

    default:
      throw new Error(`Unknown snapshot tool: ${name}`)
  }
}
