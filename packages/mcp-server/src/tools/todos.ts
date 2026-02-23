import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const todoTools: Tool[] = [
  {
    name: "create_todo",
    description:
      "Create a new todo item. Returns the created todo with its ID, status, and timestamps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title for the todo (max 200 chars)" },
        description: { type: "string", description: "Longer description or details" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: 'Priority level. Default: "medium"',
        },
        projectId: { type: "string", description: "Associate with a specific project" },
        dueDate: {
          type: "number",
          description: "Due date as Unix timestamp (milliseconds)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization",
        },
        statusId: {
          type: "string",
          description:
            "Custom workflow status ID from the project config. Automatically derives the base status category.",
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description: "Label IDs from the project config",
        },
        assigneeId: {
          type: "string",
          description: "Member ID from the project config to assign this todo to",
        },
        estimate: {
          type: "string",
          description: 'Effort estimate value (e.g. "3" for points, "M" for t-shirt)',
        },
        cycleId: {
          type: "string",
          description: "Cycle ID to associate this todo with a sprint/iteration",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_todo",
    description: "Update one or more fields on an existing todo.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The todo ID" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "New status",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "New priority",
        },
        dueDate: {
          type: ["number", "null"],
          description: "New due date (Unix ms) or null to clear",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Replace tags",
        },
        projectId: {
          type: ["string", "null"],
          description: "Move to a different project, or null to unscope",
        },
        statusId: {
          type: ["string", "null"],
          description:
            "Custom workflow status ID. Derives base status category automatically. Null to clear.",
        },
        labelIds: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Replace label IDs, or null to clear",
        },
        assigneeId: {
          type: ["string", "null"],
          description: "Member ID to assign, or null to unassign",
        },
        estimate: {
          type: ["string", "null"],
          description: "Effort estimate value, or null to clear",
        },
        cycleId: {
          type: ["string", "null"],
          description: "Cycle ID, or null to remove from cycle",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "complete_todo",
    description: 'Mark a todo as completed. Shorthand for update_todo with status: "completed".',
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The todo ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_todos",
    description:
      "List todos with optional filters. Returns todos sorted by creation date (newest first).",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "Filter by project" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "Filter by status",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Filter by priority",
        },
        search: {
          type: "string",
          description: "Full-text search in title and description",
        },
        limit: {
          type: "number",
          description: "Max results (1-100). Default: 20",
        },
      },
    },
  },
  {
    name: "get_todo",
    description: "Get a single todo by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The todo ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_todo",
    description: "Permanently delete a todo.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The todo ID" },
      },
      required: ["id"],
    },
  },
]

export async function handleTodoTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_todo":
      return await client.mutation(api.todos.create, {
        apiKeyHash,
        title: args.title as string,
        description: args.description as string | undefined,
        priority: args.priority as "low" | "medium" | "high" | "urgent" | undefined,
        projectId: args.projectId as string | undefined,
        dueDate: args.dueDate as number | undefined,
        tags: args.tags as string[] | undefined,
        statusId: args.statusId as string | undefined,
        labelIds: args.labelIds as string[] | undefined,
        assigneeId: args.assigneeId as string | undefined,
        estimate: args.estimate as string | undefined,
        cycleId: args.cycleId as string | undefined,
      })

    case "update_todo":
      return await client.mutation(api.todos.update, {
        apiKeyHash,
        id: args.id as string,
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        status: args.status as "pending" | "in_progress" | "completed" | "cancelled" | undefined,
        priority: args.priority as "low" | "medium" | "high" | "urgent" | undefined,
        dueDate: args.dueDate as number | null | undefined,
        tags: args.tags as string[] | undefined,
        projectId: args.projectId as string | null | undefined,
        statusId: args.statusId as string | null | undefined,
        labelIds: args.labelIds as string[] | null | undefined,
        assigneeId: args.assigneeId as string | null | undefined,
        estimate: args.estimate as string | null | undefined,
        cycleId: args.cycleId as string | null | undefined,
      })

    case "complete_todo":
      return await client.mutation(api.todos.update, {
        apiKeyHash,
        id: args.id as string,
        status: "completed",
      })

    case "list_todos":
      return await client.query(api.todos.list, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        status: args.status as string | undefined,
        priority: args.priority as string | undefined,
        search: args.search as string | undefined,
        limit: args.limit as number | undefined,
      })

    case "get_todo":
      return await client.query(api.todos.get, {
        apiKeyHash,
        id: args.id as string,
      })

    case "delete_todo":
      return await client.mutation(api.todos.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown todo tool: ${name}`)
  }
}
