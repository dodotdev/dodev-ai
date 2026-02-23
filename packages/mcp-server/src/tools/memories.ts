import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const memoryTools: Tool[] = [
  {
    name: "add_memory",
    description:
      "Store important information for recall in future sessions. You should call this PROACTIVELY whenever you: discover facts about the codebase or infrastructure, make or observe architectural decisions, learn user preferences or conventions, encounter non-obvious behavior or gotchas, or resolve a tricky bug (store what caused it and how it was fixed). Don't wait to be asked — if something would be useful to know next time, store it now. Each memory should be a single, self-contained piece of knowledge. Prefer many small focused memories over fewer large ones.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description:
            "The memory content. Be specific and include context — write it so a future agent with no prior knowledge can understand and act on it. Max 10,000 chars.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            'Tags for categorization. Use consistent, lowercase tags (e.g. ["architecture", "database", "decision", "preference", "debugging", "deploy", "gotcha"]). Max 20 tags.',
        },
        projectId: {
          type: "string",
          description:
            "Associate with a specific project. Omit for user-global memories (preferences, cross-project knowledge).",
        },
        source: {
          type: "string",
          description:
            'Identifies which agent stored this memory (e.g. "claude-code", "cursor", "windsurf", "manual"). Always set this so memories can be traced back to their origin.',
        },
      },
      required: ["content"],
    },
  },
  {
    name: "search_memories",
    description:
      "Search stored memories for relevant context. Call this BEFORE starting work on any task to check what you already know — previous decisions, known gotchas, user preferences, and past learnings can save significant time and avoid repeating mistakes. Use natural language queries describing what you need (e.g. 'database connection issues' or 'deploy process'). Also searches across project-scoped and global memories by default.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Natural language search query. Describe what you're looking for conceptually — don't just use keywords. E.g. 'How is authentication configured?' rather than 'auth config'.",
        },
        projectId: {
          type: "string",
          description:
            "Scope search to a specific project. Both project-scoped and global memories are searched by default.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter results to memories with any of these tags (OR logic).",
        },
        limit: {
          type: "number",
          description: "Max results (1-50). Default: 10. Use higher limits when exploring a broad topic.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_memories",
    description:
      "List recent memories in chronological order. Use this to review what's been stored recently, audit memory quality, or browse memories by project or tag. For finding specific information, prefer search_memories instead.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Filter to memories in a specific project. Omit to list all memories.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter to memories with any of these tags (OR logic).",
        },
        limit: {
          type: "number",
          description: "Max results (1-100). Default: 20.",
        },
      },
    },
  },
  {
    name: "update_memory",
    description:
      "Update a memory when information changes or becomes more complete. Use this to correct outdated facts, add detail to a sparse memory, or re-tag memories for better organization. Prefer updating over creating duplicates — if a memory about the same topic already exists, update it rather than adding a new one.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The memory ID to update." },
        content: {
          type: "string",
          description: "New content. Only provide if changing the content.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Replace all tags. Only provide if changing tags.",
        },
        projectId: {
          type: ["string", "null"],
          description:
            "Move to a different project, or null to make it global. Only provide if changing project scope.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_memory",
    description:
      "Permanently delete a memory. Use sparingly — only for memories that are clearly wrong, duplicated, or no longer relevant. When in doubt, update the memory instead of deleting it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The memory ID to delete." },
      },
      required: ["id"],
    },
  },
]

export async function handleMemoryTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "add_memory":
      return await client.mutation(api.memories.add, {
        apiKeyHash,
        content: args.content as string,
        tags: args.tags as string[] | undefined,
        projectId: args.projectId as string | undefined,
        source: args.source as string | undefined,
      })

    case "search_memories":
      return await client.query(api.memories.search, {
        apiKeyHash,
        query: args.query as string,
        projectId: args.projectId as string | undefined,
        tags: args.tags as string[] | undefined,
        limit: args.limit as number | undefined,
      })

    case "list_memories":
      return await client.query(api.memories.listMemories, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        tags: args.tags as string[] | undefined,
        limit: args.limit as number | undefined,
      })

    case "update_memory":
      return await client.mutation(api.memories.update, {
        apiKeyHash,
        id: args.id as string,
        content: args.content as string | undefined,
        tags: args.tags as string[] | undefined,
        projectId: args.projectId as string | null | undefined,
      })

    case "delete_memory":
      return await client.mutation(api.memories.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown memory tool: ${name}`)
  }
}
