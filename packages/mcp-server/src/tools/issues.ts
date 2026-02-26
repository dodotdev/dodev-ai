import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { buildListWorkflowHint, buildWorkflowHint } from "./workflow-hints.js"

export const issueTools: Tool[] = [
  {
    name: "create_issue",
    description:
      "Create a new issue (bug, feature, improvement, or task). Returns the created issue with its ID, status, and timestamps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title for the issue (max 200 chars)" },
        description: { type: "string", description: "Longer description or details" },
        type: {
          type: "string",
          enum: ["bug", "feature", "improvement", "task"],
          description: 'Issue type. Default: "task"',
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor", "trivial"],
          description: 'Severity level. Default: "minor"',
        },
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
          description: "Member ID from the project config to assign this issue to",
        },
        estimate: {
          type: "string",
          description: 'Effort estimate value (e.g. "3" for points, "M" for t-shirt)',
        },
        cycleId: {
          type: "string",
          description: "Cycle ID to associate this issue with a sprint/iteration",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_issue",
    description: "Update one or more fields on an existing issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The issue ID" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "New status",
        },
        type: {
          type: "string",
          enum: ["bug", "feature", "improvement", "task"],
          description: "New issue type",
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor", "trivial"],
          description: "New severity",
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
    name: "close_issue",
    description: 'Mark an issue as completed. Shorthand for update_issue with status: "completed".',
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The issue ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_issues",
    description:
      "List issues with optional filters. Returns issues sorted by creation date (newest first). Use summary: true to get compact results (id, number, title, status, priority, type) for scanning — then call get_issue for full details on the item you need.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "Filter by project" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "Filter by base status category",
        },
        statusId: {
          type: "string",
          description:
            'Filter by specific workflow status ID (e.g. Backlog, Task, In Progress, In Review). Use get_context to see available statusIds. Takes priority over status filter when projectId is also provided.',
        },
        type: {
          type: "string",
          enum: ["bug", "feature", "improvement", "task"],
          description: "Filter by issue type",
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor", "trivial"],
          description: "Filter by severity",
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
        summary: {
          type: "boolean",
          description:
            "If true, returns compact results (id, number, title, status, statusId, priority, type, severity, assigneeId) instead of full documents. Recommended for scanning lists. Default: false",
        },
        limit: {
          type: "number",
          description: "Max results (1-100). Default: 20",
        },
      },
    },
  },
  {
    name: "get_issue",
    description: "Get a single issue by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The issue ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_issue",
    description: "Permanently delete an issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The issue ID" },
      },
      required: ["id"],
    },
  },
]

export async function handleIssueTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_issue":
      return await client.mutation(api.issues.create, {
        apiKeyHash,
        title: args.title as string,
        description: args.description as string | undefined,
        type: args.type as "bug" | "feature" | "improvement" | "task" | undefined,
        severity: args.severity as "critical" | "major" | "minor" | "trivial" | undefined,
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

    case "update_issue":
      return await client.mutation(api.issues.update, {
        apiKeyHash,
        id: args.id as string,
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        status: args.status as "pending" | "in_progress" | "completed" | "cancelled" | undefined,
        type: args.type as "bug" | "feature" | "improvement" | "task" | undefined,
        severity: args.severity as "critical" | "major" | "minor" | "trivial" | undefined,
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

    case "close_issue":
      return await client.mutation(api.issues.update, {
        apiKeyHash,
        id: args.id as string,
        status: "completed",
      })

    case "list_issues": {
      const issues = await client.query(api.issues.list, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        status: args.status as string | undefined,
        statusId: args.statusId as string | undefined,
        type: args.type as string | undefined,
        severity: args.severity as string | undefined,
        priority: args.priority as string | undefined,
        search: args.search as string | undefined,
        summary: args.summary as boolean | undefined,
        limit: args.limit as number | undefined,
      })

      if (args.projectId) {
        try {
          const project = await client.query(api.projects.get, {
            apiKeyHash,
            id: args.projectId as string,
          }) as { statuses?: { id: string; name: string; category: string }[] } | null

          if (project?.statuses?.length) {
            const hint = buildListWorkflowHint("issue", project.statuses)
            if (hint) return { items: issues, _workflowHint: hint }
          }
        } catch {
          // Non-critical
        }
      }

      return issues
    }

    case "get_issue": {
      const issue = await client.query(api.issues.get, {
        apiKeyHash,
        id: args.id as string,
      }) as Record<string, unknown> | null

      if (issue?.projectId) {
        try {
          const project = await client.query(api.projects.get, {
            apiKeyHash,
            id: issue.projectId as string,
          }) as { statuses?: { id: string; name: string; category: string }[] } | null

          if (project?.statuses?.length) {
            const hint = buildWorkflowHint(
              "issue",
              issue.status as string,
              issue.statusId as string | undefined,
              project.statuses
            )
            if (hint) {
              return { ...issue, _workflowHint: hint }
            }
          }
        } catch {
          // Non-critical — return issue without hint
        }
      }

      return issue
    }

    case "delete_issue":
      return await client.mutation(api.issues.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown issue tool: ${name}`)
  }
}
