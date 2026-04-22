import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { generateSetupInstructions } from "./setup-instructions.js"

export const linkingTools: Tool[] = [
  {
    name: "link_space",
    description:
      "Link a workspace path or git repository to a space for automatic detection. Once linked, get_context will auto-resolve the space when called from this workspace. You should call this right after creating a space to associate it with the current codebase. Returns setup instructions for CLAUDE.md — add them to the workspace's CLAUDE.md so AI agents use dodev.ai proactively.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description: "The space ID to link.",
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
      required: ["spaceId"],
    },
  },
  {
    name: "unlink_space",
    description:
      "Remove a workspace path or git repository link from a space. Use when a space is no longer associated with a particular workspace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description: "The space ID to unlink from.",
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
      required: ["spaceId"],
    },
  },
  {
    name: "update_memory_settings",
    description:
      "Configure memory behavior for a space or globally. Space-level: set default tags and memory instructions. User-level (omit spaceId): configure embedding provider settings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description: "Space ID to configure. Omit to update user-level settings.",
        },
        autoCapture: {
          type: "boolean",
          description: "Enable/disable automatic memory capture.",
        },
        defaultTags: {
          type: "array",
          items: { type: "string" },
          description: "Default tags automatically added to new memories in this space.",
        },
        memoryInstructions: {
          type: "string",
          description:
            "Custom instructions for how AI agents should manage memories in this space.",
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
    case "link_space": {
      const space = (await client.mutation(api.spaces.linkSpace, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        path: args.path as string | undefined,
        repo: args.repo as string | undefined,
      })) as { _id: string; name: string; slug: string }

      const setupInstructions = generateSetupInstructions({
        spaceName: space.name,
        spaceSlug: space.slug,
        spaceId: space._id,
      })

      return {
        space,
        setupInstructions,
        hint: "Add the setupInstructions to this workspace's CLAUDE.md file so AI agents use dodev.ai proactively in every session.",
      }
    }

    case "unlink_space":
      return await client.mutation(api.spaces.unlinkSpace, {
        apiKeyHash,
        spaceId: args.spaceId as string,
        path: args.path as string | undefined,
        repo: args.repo as string | undefined,
      })

    case "update_memory_settings":
      return await client.mutation(api.spaceConfig.updateMemorySettings, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
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
