import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const cycleTools: Tool[] = [
  {
    name: "create_cycle",
    description:
      "Create a new sprint/iteration cycle for a project. Cycles have date ranges and a lifecycle status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        name: { type: "string", description: "Cycle name (e.g. Sprint 1)" },
        description: { type: "string", description: "Cycle description or goals" },
        status: {
          type: "string",
          enum: ["upcoming", "active", "completed"],
          description: 'Initial status. Default: "upcoming"',
        },
        startDate: {
          type: "number",
          description: "Start date as Unix timestamp (milliseconds)",
        },
        endDate: {
          type: "number",
          description: "End date as Unix timestamp (milliseconds)",
        },
      },
      required: ["projectId", "name", "startDate", "endDate"],
    },
  },
  {
    name: "list_cycles",
    description: "List cycles for a project, optionally filtered by status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        status: {
          type: "string",
          enum: ["upcoming", "active", "completed"],
          description: "Filter by cycle status",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "get_cycle",
    description: "Get details about a single cycle.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The cycle ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_cycle",
    description: "Update a cycle's name, description, status, or dates.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The cycle ID" },
        name: { type: "string", description: "New name" },
        description: {
          type: ["string", "null"],
          description: "New description, or null to clear",
        },
        status: {
          type: "string",
          enum: ["upcoming", "active", "completed"],
          description: "New status",
        },
        startDate: { type: "number", description: "New start date (Unix ms)" },
        endDate: { type: "number", description: "New end date (Unix ms)" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_cycle",
    description:
      "Delete a cycle. Removes the cycle association from all todos assigned to it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The cycle ID" },
      },
      required: ["id"],
    },
  },
]

export async function handleCycleTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_cycle":
      return await client.mutation(api.cycles.create, {
        apiKeyHash,
        projectId: args.projectId as string,
        name: args.name as string,
        description: args.description as string | undefined,
        status: args.status as "upcoming" | "active" | "completed" | undefined,
        startDate: args.startDate as number,
        endDate: args.endDate as number,
      })

    case "list_cycles":
      return await client.query(api.cycles.list, {
        apiKeyHash,
        projectId: args.projectId as string,
        status: args.status as string | undefined,
      })

    case "get_cycle":
      return await client.query(api.cycles.get, {
        apiKeyHash,
        id: args.id as string,
      })

    case "update_cycle":
      return await client.mutation(api.cycles.update, {
        apiKeyHash,
        id: args.id as string,
        name: args.name as string | undefined,
        description: args.description as string | null | undefined,
        status: args.status as "upcoming" | "active" | "completed" | undefined,
        startDate: args.startDate as number | undefined,
        endDate: args.endDate as number | undefined,
      })

    case "delete_cycle":
      return await client.mutation(api.cycles.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown cycle tool: ${name}`)
  }
}
