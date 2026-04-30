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
  // -------------------------------------------------------------------------
  // R4.1 — Reviewer settings (multi-scope keys)
  // -------------------------------------------------------------------------
  {
    name: "set_user_reviewer_settings",
    description:
      "Store the reviewer API key/model/baseUrl on your USER row — lowest-precedence scope (overrides only the env fallback). Use this when you want one key for everything you do across all your spaces. Pass null on a field to clear it. Returns whether a key is now configured (never returns the key itself).",
    inputSchema: {
      type: "object" as const,
      properties: {
        apiKey: {
          type: ["string", "null"],
          description:
            "Anthropic (or compatible) API key. Pass null to clear. Stored as plaintext on your user row in your Convex deployment.",
        },
        model: {
          type: ["string", "null"],
          description:
            "Override the reviewer model (default: claude-sonnet-4-6). Pass null to clear.",
        },
        baseUrl: {
          type: ["string", "null"],
          description:
            "Override the API base URL. Use for Anthropic-compatible providers. Pass null to clear.",
        },
      },
    },
  },
  {
    name: "set_space_reviewer_settings",
    description:
      "Store the reviewer settings on a SPACE — shared across everyone with access to that space. This is the team-key primitive: one place to put a shared Anthropic key for the whole team's reviews. Higher precedence than user-level. Pass null on a field to clear.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string", description: "The space ID." },
        apiKey: {
          type: ["string", "null"],
          description: "Anthropic API key for this space. Null to clear.",
        },
        model: { type: ["string", "null"], description: "Reviewer model override." },
        baseUrl: { type: ["string", "null"], description: "API base URL override." },
      },
      required: ["spaceId"],
    },
  },
  {
    name: "set_project_reviewer_settings",
    description:
      "Store reviewer settings on a PROJECT — highest precedence. Use to bill a specific project to a different account, or to scope an experimental key away from the team's main key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID." },
        apiKey: {
          type: ["string", "null"],
          description: "Anthropic API key for this project. Null to clear.",
        },
        model: { type: ["string", "null"], description: "Reviewer model override." },
        baseUrl: { type: ["string", "null"], description: "API base URL override." },
      },
      required: ["projectId"],
    },
  },
  {
    name: "effective_reviewer_settings",
    description:
      "Show the resolved reviewer settings for a scope — model, baseUrl, and where each came from (project / space / user / env / default). Reports whether an API key is configured, but never returns the key itself. Use to diagnose 'why is request_review failing' or to confirm which scope's key will be used.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: { type: "string" },
        projectId: { type: "string" },
      },
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

    case "set_user_reviewer_settings":
      return await client.mutation(api.reviews.setUserReviewerSettings, {
        apiKeyHash,
        settings: {
          apiKey: args.apiKey as string | null | undefined,
          model: args.model as string | null | undefined,
          baseUrl: args.baseUrl as string | null | undefined,
        },
      })

    case "set_space_reviewer_settings":
      return await client.mutation(api.reviews.setSpaceReviewerSettings, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        settings: {
          apiKey: args.apiKey as string | null | undefined,
          model: args.model as string | null | undefined,
          baseUrl: args.baseUrl as string | null | undefined,
        },
      })

    case "set_project_reviewer_settings":
      return await client.mutation(api.reviews.setProjectReviewerSettings, {
        apiKeyHash,
        projectId: args.projectId as string,
        settings: {
          apiKey: args.apiKey as string | null | undefined,
          model: args.model as string | null | undefined,
          baseUrl: args.baseUrl as string | null | undefined,
        },
      })

    case "effective_reviewer_settings":
      return await client.query(api.reviews.effectiveReviewerSettings, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
      })

    default:
      throw new Error(`Unknown review tool: ${name}`)
  }
}
