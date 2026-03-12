import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const spaceConfigTools: Tool[] = [
  {
    name: "update_space_statuses",
    description:
      "Replace all workflow statuses for a space. Must include at least one status per category (pending, in_progress, completed, cancelled). Existing status IDs can be preserved.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        statuses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Existing status ID to preserve, or omit for auto-generated",
              },
              name: { type: "string", description: "Display name (max 40 chars)" },
              category: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
                description: "Base category this status maps to",
              },
              color: { type: "string", description: "Hex color (e.g. #3b82f6)" },
              position: { type: "number", description: "Sort order (0-based)" },
            },
            required: ["name", "category", "color", "position"],
          },
          description: "Complete list of statuses (replaces existing)",
        },
      },
      required: ["spaceId", "statuses"],
    },
  },
  {
    name: "add_space_label",
    description: "Add a colored label to a space.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        name: { type: "string", description: "Label name (max 40 chars)" },
        color: { type: "string", description: "Hex color (e.g. #ef4444)" },
      },
      required: ["spaceId", "name", "color"],
    },
  },
  {
    name: "remove_space_label",
    description: "Remove a label from a space. Clears the label from all tasks that reference it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        labelId: { type: "string", description: "The label ID to remove" },
      },
      required: ["spaceId", "labelId"],
    },
  },
  {
    name: "add_space_member",
    description: "Add a member to a space.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        name: { type: "string", description: "Member name (max 100 chars)" },
        role: { type: "string", description: 'Role (e.g. "developer", "designer")' },
        avatarUrl: { type: "string", description: "Avatar image URL" },
      },
      required: ["spaceId", "name", "role"],
    },
  },
  {
    name: "remove_space_member",
    description:
      "Remove a member from a space. Unassigns them from all tasks they are assigned to.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        memberId: { type: "string", description: "The member ID to remove" },
      },
      required: ["spaceId", "memberId"],
    },
  },
  {
    name: "update_estimate_scale",
    description:
      "Update the effort estimation scale for a space. If the scale type changes, clears existing estimates from tasks.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        type: {
          type: "string",
          enum: ["points", "tshirt", "hours"],
          description: "Scale type",
        },
        values: {
          type: "array",
          items: { type: "string" },
          description:
            'Scale values (e.g. ["1","2","3","5","8","13","21"] or ["XS","S","M","L","XL"])',
        },
      },
      required: ["spaceId", "type", "values"],
    },
  },
  {
    name: "update_space_persona",
    description:
      "Set or clear the AI persona for a space. The persona system prompt is returned in get_context and can guide AI agent behavior.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID" },
        systemPrompt: {
          type: ["string", "null"],
          description: "System prompt text for the AI persona (max 10,000 chars), or null to clear",
        },
      },
      required: ["spaceId"],
    },
  },
]

export async function handleSpaceConfigTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "update_space_statuses":
      return await client.mutation(api.spaceConfig.updateStatuses, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        statuses: args.statuses as Array<{
          id?: string
          name: string
          category: "pending" | "in_progress" | "completed" | "cancelled"
          color: string
          position: number
        }>,
      })

    case "add_space_label":
      return await client.mutation(api.spaceConfig.addLabel, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        name: args.name as string,
        color: args.color as string,
      })

    case "remove_space_label":
      return await client.mutation(api.spaceConfig.removeLabel, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        labelId: args.labelId as string,
      })

    case "add_space_member":
      return await client.mutation(api.spaceConfig.addMember, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        name: args.name as string,
        role: args.role as string,
        avatarUrl: args.avatarUrl as string | undefined,
      })

    case "remove_space_member":
      return await client.mutation(api.spaceConfig.removeMember, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        memberId: args.memberId as string,
      })

    case "update_estimate_scale":
      return await client.mutation(api.spaceConfig.updateEstimateScale, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        type: args.type as "points" | "tshirt" | "hours",
        values: args.values as string[],
      })

    case "update_space_persona":
      return await client.mutation(api.spaceConfig.updatePersona, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        systemPrompt: args.systemPrompt as string | null | undefined,
      })

    default:
      throw new Error(`Unknown space config tool: ${name}`)
  }
}
