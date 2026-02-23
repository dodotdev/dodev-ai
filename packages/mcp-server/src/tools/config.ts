import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const configTools: Tool[] = [
  {
    name: "update_project_statuses",
    description:
      "Replace all workflow statuses for a project. Must include at least one status per category (pending, in_progress, completed, cancelled). Existing status IDs can be preserved.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
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
      required: ["projectId", "statuses"],
    },
  },
  {
    name: "add_project_label",
    description: "Add a colored label to a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        name: { type: "string", description: "Label name (max 40 chars)" },
        color: { type: "string", description: "Hex color (e.g. #ef4444)" },
      },
      required: ["projectId", "name", "color"],
    },
  },
  {
    name: "remove_project_label",
    description:
      "Remove a label from a project. Clears the label from all todos that reference it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        labelId: { type: "string", description: "The label ID to remove" },
      },
      required: ["projectId", "labelId"],
    },
  },
  {
    name: "add_project_member",
    description: "Add a member to a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        name: { type: "string", description: "Member name (max 100 chars)" },
        role: { type: "string", description: 'Role (e.g. "developer", "designer")' },
        avatarUrl: { type: "string", description: "Avatar image URL" },
      },
      required: ["projectId", "name", "role"],
    },
  },
  {
    name: "remove_project_member",
    description:
      "Remove a member from a project. Unassigns them from all todos they are assigned to.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        memberId: { type: "string", description: "The member ID to remove" },
      },
      required: ["projectId", "memberId"],
    },
  },
  {
    name: "update_estimate_scale",
    description:
      'Update the effort estimation scale for a project. If the scale type changes, clears existing estimates from todos.',
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        type: {
          type: "string",
          enum: ["points", "tshirt", "hours"],
          description: "Scale type",
        },
        values: {
          type: "array",
          items: { type: "string" },
          description: 'Scale values (e.g. ["1","2","3","5","8","13","21"] or ["XS","S","M","L","XL"])',
        },
      },
      required: ["projectId", "type", "values"],
    },
  },
  {
    name: "update_project_persona",
    description:
      "Set or clear the AI persona for a project. The persona system prompt is returned in get_context and can guide AI agent behavior.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        systemPrompt: {
          type: ["string", "null"],
          description:
            "System prompt text for the AI persona (max 10,000 chars), or null to clear",
        },
      },
      required: ["projectId"],
    },
  },
]

export async function handleConfigTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "update_project_statuses":
      return await client.mutation(api.projectConfig.updateStatuses, {
        apiKeyHash,
        projectId: args.projectId as string,
        statuses: args.statuses as Array<{
          id?: string
          name: string
          category: "pending" | "in_progress" | "completed" | "cancelled"
          color: string
          position: number
        }>,
      })

    case "add_project_label":
      return await client.mutation(api.projectConfig.addLabel, {
        apiKeyHash,
        projectId: args.projectId as string,
        name: args.name as string,
        color: args.color as string,
      })

    case "remove_project_label":
      return await client.mutation(api.projectConfig.removeLabel, {
        apiKeyHash,
        projectId: args.projectId as string,
        labelId: args.labelId as string,
      })

    case "add_project_member":
      return await client.mutation(api.projectConfig.addMember, {
        apiKeyHash,
        projectId: args.projectId as string,
        name: args.name as string,
        role: args.role as string,
        avatarUrl: args.avatarUrl as string | undefined,
      })

    case "remove_project_member":
      return await client.mutation(api.projectConfig.removeMember, {
        apiKeyHash,
        projectId: args.projectId as string,
        memberId: args.memberId as string,
      })

    case "update_estimate_scale":
      return await client.mutation(api.projectConfig.updateEstimateScale, {
        apiKeyHash,
        projectId: args.projectId as string,
        type: args.type as "points" | "tshirt" | "hours",
        values: args.values as string[],
      })

    case "update_project_persona":
      return await client.mutation(api.projectConfig.updatePersona, {
        apiKeyHash,
        projectId: args.projectId as string,
        systemPrompt: args.systemPrompt as string | null | undefined,
      })

    default:
      throw new Error(`Unknown config tool: ${name}`)
  }
}
