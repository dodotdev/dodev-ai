import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const reviewTools: Tool[] = [
  {
    name: "request_review",
    description:
      "Run a structured review of a plan or code diff with a SECOND model and persist the verdict. Call this before implementation (stage='plan') and again before complete_task (stage='code'). The reviewer returns a verdict (approve | approve_with_suggestions | needs_revision | blocker | error), a summary, and structured findings. Verdicts are stored on the task; if the project/space sets requireReview, complete_task refuses to mark the task complete without an approved review on the corresponding stage.",
    inputSchema: {
      type: "object" as const,
      properties: {
        stage: {
          type: "string",
          enum: ["plan", "code", "ad_hoc"],
          description:
            "Which review stage. 'plan' for design review before code, 'code' for diff review before complete_task, 'ad_hoc' for one-off scope reviews not gated to a task.",
        },
        artifact: {
          type: "string",
          description:
            "The plan markdown or unified diff to review. Up to ~200K chars; longer artifacts are truncated.",
        },
        context: {
          type: "string",
          description:
            "Optional reviewer context — repo conventions, what to focus on, what to ignore. Stays in the prompt; does not persist beyond the review row.",
        },
        taskId: {
          type: "string",
          description: "Task this review is gating. Required to gate complete_task.",
        },
        issueId: {
          type: "string",
          description: "Optional — link the review to an issue instead of a task.",
        },
        spaceId: { type: "string", description: "Scope: a space." },
        projectId: { type: "string", description: "Scope: a project (wins over spaceId)." },
        reviewerModel: {
          type: "string",
          description:
            "Override the reviewer model. Defaults to project.requireReview.reviewerModel, then space.requireReview.reviewerModel, then REVIEWER_MODEL env, then claude-sonnet-4-6.",
        },
      },
      required: ["stage", "artifact"],
    },
  },
  {
    name: "list_task_reviews",
    description:
      "Get review history for a task, newest first. Use to inspect past verdicts and findings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "The task ID." },
        stage: {
          type: "string",
          enum: ["plan", "code", "ad_hoc"],
          description: "Filter to a single stage.",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "latest_task_reviews",
    description:
      "Get the most recent plan and code reviews for a task. Returns { plan?, code? }. Useful before calling complete_task to check whether the gate will accept the transition.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "The task ID." },
      },
      required: ["taskId"],
    },
  },
  {
    name: "get_review",
    description: "Fetch a single review by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The review ID." },
      },
      required: ["id"],
    },
  },
]

export async function handleReviewTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "request_review":
      return await client.action(api.reviews.request, {
        apiKeyHash,
        stage: args.stage as "plan" | "code" | "ad_hoc",
        artifact: args.artifact as string,
        context: args.context as string | undefined,
        taskId: args.taskId as string | undefined,
        issueId: args.issueId as string | undefined,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        reviewerModel: args.reviewerModel as string | undefined,
      })

    case "list_task_reviews":
      return await client.query(api.reviews.listForTask, {
        apiKeyHash,
        taskId: args.taskId as string,
        stage: args.stage as "plan" | "code" | "ad_hoc" | undefined,
      })

    case "latest_task_reviews":
      return await client.query(api.reviews.latestForTask, {
        apiKeyHash,
        taskId: args.taskId as string,
      })

    case "get_review":
      return await client.query(api.reviews.get, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown review tool: ${name}`)
  }
}
