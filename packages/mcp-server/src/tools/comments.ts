import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const commentTools: Tool[] = [
  {
    name: "create_comment",
    description:
      "Add a comment to a todo or issue. Use this to log work progress, decisions, or notes. Supports threading via parentId.",
    inputSchema: {
      type: "object" as const,
      properties: {
        todoId: {
          type: "string",
          description: "Todo ID to comment on",
        },
        issueId: {
          type: "string",
          description: "Issue ID to comment on",
        },
        parentId: {
          type: "string",
          description:
            "Parent comment ID for threaded replies (inherits todoId/issueId from parent)",
        },
        body: {
          type: "string",
          description: "Comment text (markdown supported)",
        },
        authorName: {
          type: "string",
          description: "Display name of the comment author",
        },
        authorType: {
          type: "string",
          enum: ["user", "agent"],
          description: "Whether the comment was posted by a user or an AI agent",
        },
      },
      required: ["body"],
    },
  },
  {
    name: "list_comments",
    description:
      "List all comments on a todo or issue, sorted chronologically. Exactly one of todoId or issueId is required.",
    inputSchema: {
      type: "object" as const,
      properties: {
        todoId: {
          type: "string",
          description: "Todo ID to list comments for",
        },
        issueId: {
          type: "string",
          description: "Issue ID to list comments for",
        },
      },
    },
  },
  {
    name: "delete_comment",
    description: "Delete a comment by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The comment ID to delete" },
      },
      required: ["id"],
    },
  },
]

export async function handleCommentTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "create_comment":
      return await client.mutation(api.comments.create, {
        apiKeyHash,
        todoId: args.todoId as string | undefined,
        issueId: args.issueId as string | undefined,
        parentId: args.parentId as string | undefined,
        body: args.body as string,
        authorName: args.authorName as string | undefined,
        authorType: args.authorType as "user" | "agent" | undefined,
      } as never)

    case "list_comments":
      return await client.query(api.comments.list, {
        apiKeyHash,
        todoId: args.todoId as string | undefined,
        issueId: args.issueId as string | undefined,
      } as never)

    case "delete_comment":
      return await client.mutation(api.comments.remove, {
        apiKeyHash,
        id: args.id as string,
      } as never)

    default:
      throw new Error(`Unknown comment tool: ${name}`)
  }
}
