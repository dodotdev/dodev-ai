import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const handoverTools: Tool[] = [
  {
    name: "create_handover",
    description:
      "Write a session-end handover: a narrative document capturing decisions made, blockers encountered, and what's next. Different shape than a memory — memories are atomic facts; a handover is the temporal narrative of a single session. Call this at the END of a significant session, after take_snapshot. Append-only — never edit prior handovers; if you need to correct something, write a new handover that references the prior one.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short session title (e.g. 'OAuth bridge ship + handover artifact spike').",
        },
        tldr: {
          type: "string",
          description: "1-2 sentence summary. Read first by future agents.",
        },
        markdown: {
          type: "string",
          description:
            "Full body in markdown. Recommended sections: Summary, Decisions, Blockers, What's Next.",
        },
        spaceId: { type: "string", description: "Scope: a space." },
        projectId: { type: "string", description: "Scope: a project (wins over spaceId)." },
        author: {
          type: "string",
          description:
            "Identifier for who wrote this — agent name (e.g. 'claude-code'), user name, or 'manual'.",
        },
        decisions: {
          type: "array",
          items: { type: "string" },
          description: "Structured list of decisions made this session (one bullet each).",
        },
        blockers: {
          type: "array",
          items: { type: "string" },
          description: "Structured list of blockers — external dependencies preventing progress.",
        },
        nextSteps: {
          type: "array",
          items: { type: "string" },
          description:
            "Structured list of what's next. The recommend() engine boosts tasks named here.",
        },
        referencedTaskIds: {
          type: "array",
          items: { type: "string" },
          description: "Task IDs explicitly referenced in nextSteps. Used by recommend() boost.",
        },
        referencedIssueIds: {
          type: "array",
          items: { type: "string" },
          description: "Issue IDs explicitly referenced in nextSteps.",
        },
        gitHead: {
          type: "string",
          description:
            "Git HEAD SHA at handover time. Captured by hooks; usually not needed manually.",
        },
      },
      required: ["title", "tldr", "markdown"],
    },
  },
  {
    name: "list_handovers",
    description:
      "List recent handovers in a scope, newest first. Use this when reviewing history — for quick session-start priming, prefer latest_handovers which limits to the most recent N.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string" },
        projectId: { type: "string" },
        limit: { type: "number", description: "Max results (1-100). Default: 20." },
      },
    },
  },
  {
    name: "latest_handovers",
    description:
      "Return the N most recent handovers in a scope. Designed for session-start prompt injection. Reading the LATEST 3 (default) gives reasoning history — not just the current state — and is the cheapest way for an agent to understand 'why is the codebase this way' without scanning git log.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string" },
        projectId: { type: "string" },
        count: { type: "number", description: "How many to return (1-10). Default: 3." },
      },
    },
  },
  {
    name: "get_handover",
    description: "Fetch a single handover by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The handover ID." },
      },
      required: ["id"],
    },
  },
]

export async function handleHandoverTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_handover":
      return await client.mutation(api.handovers.create, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        title: args.title as string,
        tldr: args.tldr as string,
        markdown: args.markdown as string,
        author: args.author as string | undefined,
        decisions: args.decisions as string[] | undefined,
        blockers: args.blockers as string[] | undefined,
        nextSteps: args.nextSteps as string[] | undefined,
        referencedTaskIds: args.referencedTaskIds as string[] | undefined,
        referencedIssueIds: args.referencedIssueIds as string[] | undefined,
        gitHead: args.gitHead as string | undefined,
      })

    case "list_handovers":
      return await client.query(api.handovers.list, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        limit: args.limit as number | undefined,
      })

    case "latest_handovers":
      return await client.query(api.handovers.latest, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        count: args.count as number | undefined,
      })

    case "get_handover":
      return await client.query(api.handovers.get, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown handover tool: ${name}`)
  }
}
