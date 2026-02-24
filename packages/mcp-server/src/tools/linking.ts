import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { generateSetupInstructions } from "./setup-instructions.js"

export const linkingTools: Tool[] = [
  {
    name: "link_project",
    description:
      "Link a workspace path or git repository to a project for automatic detection. Once linked, get_context will auto-resolve the project when called from this workspace. You should call this right after creating a project to associate it with the current codebase. Returns setup instructions for CLAUDE.md — add them to the project's CLAUDE.md so AI agents use DoMCP proactively.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to link.",
        },
        path: {
          type: "string",
          description:
            "Absolute filesystem path to link (e.g. /Users/me/code/my-project). The workspace directory.",
        },
        repo: {
          type: "string",
          description:
            'Git remote URL to link (e.g. "git@github.com:org/repo.git" or "https://github.com/org/repo"). Normalized automatically.',
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "unlink_project",
    description:
      "Remove a workspace path or git repository link from a project. Use when a project is no longer associated with a particular workspace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to unlink from.",
        },
        path: {
          type: "string",
          description: "The workspace path to remove.",
        },
        repo: {
          type: "string",
          description: "The git remote URL to remove.",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "update_memory_settings",
    description:
      "Configure memory behavior for a project or globally. Project-level: set default tags and memory instructions. User-level (omit projectId): configure embedding provider settings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to configure. Omit to update user-level settings.",
        },
        autoCapture: {
          type: "boolean",
          description: "Enable/disable automatic memory capture.",
        },
        defaultTags: {
          type: "array",
          items: { type: "string" },
          description: "Default tags automatically added to new memories in this project.",
        },
        memoryInstructions: {
          type: "string",
          description:
            "Custom instructions for how AI agents should manage memories in this project.",
        },
        embeddingProvider: {
          type: "string",
          description: "Embedding provider name (user-level only).",
        },
        embeddingModel: {
          type: "string",
          description:
            'Embedding model identifier (user-level only). E.g. "openai/text-embedding-3-small".',
        },
        embeddingBaseUrl: {
          type: "string",
          description: "Base URL for the embedding API (user-level only).",
        },
        embeddingApiKey: {
          type: "string",
          description: "API key for the embedding provider (user-level only).",
        },
      },
    },
  },
]

export async function handleLinkingTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "link_project": {
      const project = (await client.mutation(api.projects.linkProject, {
        apiKeyHash,
        projectId: args.projectId as string,
        path: args.path as string | undefined,
        repo: args.repo as string | undefined,
      })) as { _id: string; name: string; stub: string }

      const setupInstructions = generateSetupInstructions({
        projectName: project.name,
        projectStub: project.stub,
        projectId: project._id,
      })

      return {
        project,
        setupInstructions,
        hint: "Add the setupInstructions to this project's CLAUDE.md file so AI agents use DoMCP proactively in every session.",
      }
    }

    case "unlink_project":
      return await client.mutation(api.projects.unlinkProject, {
        apiKeyHash,
        projectId: args.projectId as string,
        path: args.path as string | undefined,
        repo: args.repo as string | undefined,
      })

    case "update_memory_settings":
      return await client.mutation(api.projectConfig.updateMemorySettings, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        autoCapture: args.autoCapture as boolean | undefined,
        defaultTags: args.defaultTags as string[] | undefined,
        memoryInstructions: args.memoryInstructions as string | undefined,
        embeddingProvider: args.embeddingProvider as string | undefined,
        embeddingModel: args.embeddingModel as string | undefined,
        embeddingBaseUrl: args.embeddingBaseUrl as string | undefined,
        embeddingApiKey: args.embeddingApiKey as string | undefined,
      })

    default:
      throw new Error(`Unknown linking tool: ${name}`)
  }
}
