import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const spaceTools: Tool[] = [
  {
    name: "create_space",
    description:
      "Create a new space to organize tasks, issues, and memories for a codebase or initiative. After creating, call link_space to associate the current workspace so the space is auto-detected in future sessions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Space name (max 100 chars)" },
        slug: {
          type: "string",
          description:
            'Short uppercase identifier for issues (e.g. "DO"). Auto-derived from name if omitted. Issues will be numbered as SLUG-1, SLUG-2, etc.',
        },
        description: { type: "string", description: "Space description" },
        metadata: {
          type: "object",
          description: 'Key-value pairs for custom data (e.g. {"repo": "github.com/org/repo"})',
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_spaces",
    description:
      "List all spaces. By default excludes archived spaces. Optionally include task/memory counts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["active", "paused", "completed", "archived"],
          description: "Filter by status",
        },
        includeStats: {
          type: "boolean",
          description: "Include task/memory counts. Default: false",
        },
      },
    },
  },
  {
    name: "get_space",
    description: "Get detailed info about a single space.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The space ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_space",
    description: "Update a space's name, slug, description, status, or metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The space ID" },
        name: { type: "string", description: "New name" },
        slug: { type: "string", description: "New slug (uppercase identifier)" },
        description: { type: "string", description: "New description" },
        status: {
          type: "string",
          enum: ["active", "paused", "completed", "archived"],
          description: "New status",
        },
        metadata: { type: "object", description: "Replace metadata" },
      },
      required: ["id"],
    },
  },
  {
    name: "archive_space",
    description: "Archive a space. Archived spaces are hidden from list_spaces by default.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The space ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "set_active_space",
    description:
      "Manually set the active space for this session. Usually not needed — if the workspace is linked to a space via link_space, it's auto-detected by get_context. Use this only when working outside a linked workspace or switching spaces mid-session.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: ["string", "null"],
          description: "The space ID to set as active, or null to clear",
        },
      },
      required: ["id"],
    },
  },
]

export async function handleSpaceTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_space":
      return await client.mutation(api.spaces.create, {
        apiKeyHash,
        name: args.name as string,
        slug: args.slug as string | undefined,
        description: args.description as string | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      })

    case "list_spaces":
      return await client.query(api.spaces.list, {
        apiKeyHash,
        status: args.status as string | undefined,
        includeStats: args.includeStats as boolean | undefined,
      })

    case "get_space": {
      const space = await client.query(api.spaces.get, {
        apiKeyHash,
        id: args.id as string,
      })
      if (!space) throw new Error("Space not found")
      return space
    }

    case "update_space":
      return await client.mutation(api.spaces.update, {
        apiKeyHash,
        id: args.id as string,
        name: args.name as string | undefined,
        slug: args.slug as string | undefined,
        description: args.description as string | undefined,
        status: args.status as "active" | "paused" | "completed" | "archived" | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      })

    case "archive_space":
      return await client.mutation(api.spaces.archive, {
        apiKeyHash,
        id: args.id as string,
      })

    case "set_active_space":
      return await client.mutation(api.sessions.setActiveSpace, {
        apiKeyHash,
        agentId: process.env.DODEV_AGENT_ID ?? "default",
        spaceId: args.id as string | null | undefined,
      })

    default:
      throw new Error(`Unknown space tool: ${name}`)
  }
}
