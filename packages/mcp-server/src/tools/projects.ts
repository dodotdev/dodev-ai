import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const projectTools: Tool[] = [
  {
    name: "create_project",
    description:
      "Create a new project to organize todos, issues, and memories for a codebase or initiative. After creating, call link_project to associate the current workspace so the project is auto-detected in future sessions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Project name (max 100 chars)" },
        slug: {
          type: "string",
          description:
            'Short uppercase identifier for issues (e.g. "DO"). Auto-derived from name if omitted. Issues will be numbered as SLUG-1, SLUG-2, etc.',
        },
        description: { type: "string", description: "Project description" },
        metadata: {
          type: "object",
          description: 'Key-value pairs for custom data (e.g. {"repo": "github.com/org/repo"})',
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_projects",
    description:
      "List all projects. By default excludes archived projects. Optionally include todo/memory counts.",
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
          description: "Include todo/memory counts. Default: false",
        },
      },
    },
  },
  {
    name: "get_project",
    description: "Get detailed info about a single project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The project ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_project",
    description: "Update a project's name, slug, description, status, or metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The project ID" },
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
    name: "archive_project",
    description: "Archive a project. Archived projects are hidden from list_projects by default.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The project ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "set_active_project",
    description:
      "Manually set the active project for this session. Usually not needed — if the workspace is linked to a project via link_project, it's auto-detected by get_context. Use this only when working outside a linked workspace or switching projects mid-session.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: ["string", "null"],
          description: "The project ID to set as active, or null to clear",
        },
      },
      required: ["id"],
    },
  },
]

export async function handleProjectTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_project":
      return await client.mutation(api.projects.create, {
        apiKeyHash,
        name: args.name as string,
        slug: args.slug as string | undefined,
        description: args.description as string | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      })

    case "list_projects":
      return await client.query(api.projects.list, {
        apiKeyHash,
        status: args.status as string | undefined,
        includeStats: args.includeStats as boolean | undefined,
      })

    case "get_project": {
      const project = await client.query(api.projects.get, {
        apiKeyHash,
        id: args.id as string,
      })
      if (!project) throw new Error("Project not found")
      return project
    }

    case "update_project":
      return await client.mutation(api.projects.update, {
        apiKeyHash,
        id: args.id as string,
        name: args.name as string | undefined,
        slug: args.slug as string | undefined,
        description: args.description as string | undefined,
        status: args.status as "active" | "paused" | "completed" | "archived" | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      })

    case "archive_project":
      return await client.mutation(api.projects.archive, {
        apiKeyHash,
        id: args.id as string,
      })

    case "set_active_project":
      return await client.mutation(api.sessions.setActiveProject, {
        apiKeyHash,
        agentId: process.env.DODEV_AGENT_ID ?? "default",
        projectId: args.id as string | null | undefined,
      })

    default:
      throw new Error(`Unknown project tool: ${name}`)
  }
}
