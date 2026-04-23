import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const projectTools: Tool[] = [
  {
    name: "create_project",
    description:
      "Create a project inside a space. Projects are filter scopes — use them to segregate tasks, issues, and memories within a space. Projects do NOT have their own statuses, labels, members, estimates, or persona; all workflow config comes from the parent space. Items tagged with a projectId still use {SPACE}-{N} slugs (space-level counter).",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "Parent space ID (required)" },
        name: { type: "string", description: "Project name (max 100 chars)" },
        slug: {
          type: "string",
          description:
            'Short uppercase identifier for filtering (e.g. "API"). Auto-derived from name if omitted; auto-suffixed on collision within the space. Max 8 chars.',
        },
        description: { type: "string", description: "Project description" },
        metadata: {
          type: "object",
          description: 'Key-value pairs for custom data (e.g. {"repo": "github.com/org/api"})',
        },
      },
      required: ["spaceId", "name"],
    },
  },
  {
    name: "list_projects",
    description:
      "List projects, optionally narrowed to a single space. Excludes archived projects unless a status filter is passed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "Narrow to a specific space (optional)" },
        status: {
          type: "string",
          enum: ["active", "paused", "completed", "archived"],
          description: "Filter by status",
        },
      },
    },
  },
  {
    name: "get_project",
    description:
      "Get details about a single project: name, slug, description, status, linked paths/repos. Workflow config (statuses, labels, members, estimates, persona) lives on the parent space — fetch it via get_space.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The project ID" },
        spaceId: {
          type: "string",
          description: "Required when `slug` is used instead of `id`.",
        },
        slug: {
          type: "string",
          description: "Alternate lookup: project slug within spaceId (e.g. 'API').",
        },
      },
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
        slug: { type: "string", description: "New slug (unique within the space)" },
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
    description:
      "Archive a project (soft). Archived projects are hidden from list_projects by default. Tasks, issues, and memories inside the project are preserved.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The project ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_project",
    description:
      "Delete a project. Tasks, issues, memories, cycles, and versions inside the project are NOT deleted — they are detached back to the parent space (projectId cleared). Use archive_project if you want to preserve the project record.",
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
      "Manually set the active project for this session. When set, get_context narrows tasks/memories/cycles to the project by default. Passing null clears the active project (session reverts to space-level scope). Setting a project auto-aligns the session's active space to the project's parent.",
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
  {
    name: "link_project",
    description:
      "Link a workspace path or git repository to a project for automatic detection (v0.1.0+). Takes precedence over space-level links when get_context resolves the current workspace — so you can link space 'DODEV' to the monorepo root and project 'API' to a subdirectory. Call this right after creating a project if it has a distinct path.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        path: {
          type: "string",
          description: "Absolute filesystem path (e.g. /Users/me/code/myapp/api).",
        },
        repo: {
          type: "string",
          description:
            "Git repo URL (github.com/org/repo or https://github.com/org/repo). Normalized automatically.",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "unlink_project",
    description:
      "Remove a path or repo from a project's linked workspaces (v0.1.0+). Does not delete the project itself.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" },
        path: { type: "string", description: "Path to remove" },
        repo: { type: "string", description: "Repo URL to remove" },
      },
      required: ["projectId"],
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
        spaceId: args.spaceId as string,
        name: args.name as string,
        slug: args.slug as string | undefined,
        description: args.description as string | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      })

    case "list_projects":
      return await client.query(api.projects.list, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        status: args.status as "active" | "paused" | "completed" | "archived" | undefined,
      })

    case "get_project": {
      if (args.slug) {
        if (!args.spaceId) throw new Error("spaceId is required when using slug lookup")
        const project = await client.query(api.projects.getBySlug, {
          apiKeyHash,
          spaceId: args.spaceId as string,
          slug: args.slug as string,
        })
        if (!project) throw new Error("Project not found")
        return project
      }
      if (!args.id) throw new Error("id or (spaceId + slug) required")
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

    case "delete_project":
      return await client.mutation(api.projects.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    case "set_active_project":
      return await client.mutation(api.sessions.setActiveProject, {
        apiKeyHash,
        agentId: process.env.DODEV_AGENT_ID ?? "default",
        projectId: args.id as string | null | undefined,
      })

    case "link_project":
      return await client.mutation(api.projects.linkProject, {
        apiKeyHash,
        projectId: args.projectId as string,
        path: args.path as string | undefined,
        repo: args.repo as string | undefined,
      })

    case "unlink_project":
      return await client.mutation(api.projects.unlinkProject, {
        apiKeyHash,
        projectId: args.projectId as string,
        path: args.path as string | undefined,
        repo: args.repo as string | undefined,
      })

    default:
      throw new Error(`Unknown project tool: ${name}`)
  }
}
