import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const versionTools: Tool[] = [
  {
    name: "create_version",
    description:
      "Create a new version for a project. Versions track releases and can have tasks/issues linked as changelog entries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        name: { type: "string", description: 'Version name (e.g. "0.0.8", "1.0.0")' },
        description: { type: "string", description: "Version description or release notes" },
        status: {
          type: "string",
          enum: ["draft", "released"],
          description: 'Initial status. Default: "draft"',
        },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "list_versions",
    description: "List versions for a project, optionally filtered by status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        status: {
          type: "string",
          enum: ["draft", "released"],
          description: "Filter by version status",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "get_version",
    description: "Get details about a single version.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The version ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_version",
    description:
      "Update a version's name, description, status, or release date. When status changes to 'released', releasedAt is auto-set.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The version ID" },
        name: { type: "string", description: "New name" },
        description: {
          type: ["string", "null"],
          description: "New description, or null to clear",
        },
        status: {
          type: "string",
          enum: ["draft", "released"],
          description: "New status",
        },
        releasedAt: {
          type: ["number", "null"],
          description:
            "Release date (Unix ms), or null to clear. Auto-set when status changes to released.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_version",
    description:
      "Delete a version. Removes the version association from all tasks and issues assigned to it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The version ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_changelog",
    description:
      "Get the changelog for a version. Returns all tasks and issues linked to this version where changelog is true.",
    inputSchema: {
      type: "object" as const,
      properties: {
        versionId: { type: "string", description: "The version ID" },
      },
      required: ["versionId"],
    },
  },
]

export async function handleVersionTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_version":
      return await client.mutation(api.versions.create, {
        apiKeyHash,
        projectId: args.projectId as string,
        name: args.name as string,
        description: args.description as string | undefined,
        status: args.status as "draft" | "released" | undefined,
      })

    case "list_versions":
      return await client.query(api.versions.list, {
        apiKeyHash,
        projectId: args.projectId as string,
        status: args.status as string | undefined,
      })

    case "get_version":
      return await client.query(api.versions.get, {
        apiKeyHash,
        id: args.id as string,
      })

    case "update_version":
      return await client.mutation(api.versions.update, {
        apiKeyHash,
        id: args.id as string,
        name: args.name as string | undefined,
        description: args.description as string | null | undefined,
        status: args.status as "draft" | "released" | undefined,
        releasedAt: args.releasedAt as number | null | undefined,
      })

    case "delete_version":
      return await client.mutation(api.versions.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    case "get_changelog":
      return await client.query(api.versions.getChangelog, {
        apiKeyHash,
        versionId: args.versionId as string,
      })

    default:
      throw new Error(`Unknown version tool: ${name}`)
  }
}
