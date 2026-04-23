import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { buildListWorkflowHint, buildWorkflowHint } from "./workflow-hints.js"

export const taskTools: Tool[] = [
  {
    name: "create_task",
    description: "Create a new task. Returns the created task with its ID, status, and timestamps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title for the task (max 200 chars)" },
        description: { type: "string", description: "Longer description or details" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: 'Priority level. Default: "medium"',
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor", "trivial"],
          description: "Severity level (optional for tasks)",
        },
        spaceId: {
          type: "string",
          description:
            "Associate with a specific space. Auto-derived from projectId when provided.",
        },
        projectId: {
          type: "string",
          description:
            "Tag the task with a project (filter scope) inside the space. Task still gets a {SPACE}-{N} slug from the space counter; projectId is just a filter field. statusId/labelIds/assigneeId always reference the space's config.",
        },
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
            "Custom workflow status ID from the space config. Automatically derives the base status category.",
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description: "Label IDs from the space config",
        },
        assigneeId: {
          type: "string",
          description: "Member ID from the space config to assign this task to",
        },
        estimate: {
          type: "string",
          description: 'Effort estimate value (e.g. "3" for points, "M" for t-shirt)',
        },
        cycleId: {
          type: "string",
          description: "Cycle ID to associate this task with a sprint/iteration",
        },
        changelog: {
          type: "boolean",
          description: "If true, this task will appear in version changelogs",
        },
        versionId: {
          type: "string",
          description: "Version ID to associate this task with a release version",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update one or more fields on an existing task.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The task ID" },
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
        severity: {
          type: ["string", "null"],
          enum: ["critical", "major", "minor", "trivial"],
          description: "New severity, or null to clear",
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
        spaceId: {
          type: ["string", "null"],
          description: "Move to a different space, or null to unscope",
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
        changelog: {
          type: ["boolean", "null"],
          description: "If true, include in version changelog. Null to clear.",
        },
        versionId: {
          type: ["string", "null"],
          description: "Version ID, or null to remove from version",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "complete_task",
    description: 'Mark a task as completed. Shorthand for update_task with status: "completed".',
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The task ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_tasks",
    description:
      "List tasks with optional filters. Returns tasks sorted by creation date (newest first). Use summary: true to get compact results (id, number, title, status, priority) for scanning — then call get_task for full details on the item you need.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "Filter by space" },
        projectId: {
          type: "string",
          description:
            "Filter by project inside a space (v0.1.0+). When set together with spaceId, projectId wins.",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "Filter by base status category",
        },
        statusId: {
          type: "string",
          description:
            "Filter by specific workflow status ID (e.g. Backlog, Task, In Progress, In Review). Use get_context to see available statusIds. Takes priority over status filter when spaceId is also provided.",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Filter by priority",
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor", "trivial"],
          description: "Filter by severity",
        },
        search: {
          type: "string",
          description: "Full-text search in title and description",
        },
        summary: {
          type: "boolean",
          description:
            "If true, returns compact results (id, number, title, status, statusId, priority, assigneeId) instead of full documents. Recommended for scanning lists. Default: false",
        },
        limit: {
          type: "number",
          description: "Max results (1-100). Default: 20",
        },
      },
    },
  },
  {
    name: "get_task",
    description: "Get a single task by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The task ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The task ID" },
      },
      required: ["id"],
    },
  },
]

export async function handleTaskTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_task":
      return await client.mutation(api.tasks.create, {
        apiKeyHash,
        title: args.title as string,
        description: args.description as string | undefined,
        priority: args.priority as "low" | "medium" | "high" | "urgent" | undefined,
        severity: args.severity as "critical" | "major" | "minor" | "trivial" | undefined,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        dueDate: args.dueDate as number | undefined,
        tags: args.tags as string[] | undefined,
        statusId: args.statusId as string | undefined,
        labelIds: args.labelIds as string[] | undefined,
        assigneeId: args.assigneeId as string | undefined,
        estimate: args.estimate as string | undefined,
        cycleId: args.cycleId as string | undefined,
        changelog: args.changelog as boolean | undefined,
        versionId: args.versionId as string | undefined,
      })

    case "update_task":
      return await client.mutation(api.tasks.update, {
        apiKeyHash,
        id: args.id as string,
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        status: args.status as "pending" | "in_progress" | "completed" | "cancelled" | undefined,
        priority: args.priority as "low" | "medium" | "high" | "urgent" | undefined,
        severity: args.severity as "critical" | "major" | "minor" | "trivial" | null | undefined,
        dueDate: args.dueDate as number | null | undefined,
        tags: args.tags as string[] | undefined,
        spaceId: args.spaceId as string | null | undefined,
        statusId: args.statusId as string | null | undefined,
        labelIds: args.labelIds as string[] | null | undefined,
        assigneeId: args.assigneeId as string | null | undefined,
        estimate: args.estimate as string | null | undefined,
        cycleId: args.cycleId as string | null | undefined,
        changelog: args.changelog as boolean | null | undefined,
        versionId: args.versionId as string | null | undefined,
      })

    case "complete_task":
      return await client.mutation(api.tasks.update, {
        apiKeyHash,
        id: args.id as string,
        status: "completed",
      })

    case "list_tasks": {
      const tasks = await client.query(api.tasks.list, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        status: args.status as string | undefined,
        statusId: args.statusId as string | undefined,
        priority: args.priority as string | undefined,
        search: args.search as string | undefined,
        summary: args.summary as boolean | undefined,
        limit: args.limit as number | undefined,
      })

      if (args.spaceId) {
        try {
          const space = (await client.query(api.spaces.get, {
            apiKeyHash,
            id: args.spaceId as string,
          })) as { statuses?: { id: string; name: string; category: string }[] } | null

          if (space?.statuses?.length) {
            const hint = buildListWorkflowHint("task", space.statuses)
            if (hint) return { items: tasks, _workflowHint: hint }
          }
        } catch {
          // Non-critical
        }
      }

      return tasks
    }

    case "get_task": {
      const task = (await client.query(api.tasks.get, {
        apiKeyHash,
        id: args.id as string,
      })) as Record<string, unknown> | null

      if (task?.spaceId) {
        try {
          const space = (await client.query(api.spaces.get, {
            apiKeyHash,
            id: task.spaceId as string,
          })) as { statuses?: { id: string; name: string; category: string }[] } | null

          if (space?.statuses?.length) {
            const hint = buildWorkflowHint(
              "task",
              task.status as string,
              task.statusId as string | undefined,
              space.statuses
            )
            if (hint) {
              return { ...task, _workflowHint: hint }
            }
          }
        } catch {
          // Non-critical — return task without hint
        }
      }

      return task
    }

    case "delete_task":
      return await client.mutation(api.tasks.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown task tool: ${name}`)
  }
}
