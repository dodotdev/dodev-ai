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
        spaceId: {
          type: "string",
          description:
            "Associate with a specific space. Omit for user-global memories (preferences, cross-space knowledge).",
        },
        source: {
          type: "string",
          description:
            'Identifies which agent stored this memory (e.g. "claude-code", "cursor", "windsurf", "manual"). Always set this so memories can be traced back to their origin.',
        },
        type: {
          type: "string",
          enum: ["fact", "decision", "preference", "context", "learning"],
          description:
            'Classify the memory type. "fact" for codebase/infrastructure facts, "decision" for architectural or design decisions, "preference" for user preferences/conventions, "context" for project context/background, "learning" for lessons learned or gotchas.',
        },
        importance: {
          type: "number",
          description:
            "How important this memory is (0.0-1.0). Higher importance memories are prioritized in search results. Default: unset (treated as normal).",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "search_memories",
    description:
      "Search stored memories for relevant context. Call this BEFORE starting work on any task to check what you already know — previous decisions, known gotchas, user preferences, and past learnings can save significant time and avoid repeating mistakes. Supports keyword search, semantic search (understands meaning), and hybrid mode (combines both). Use natural language queries describing what you need.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Natural language search query. Describe what you're looking for conceptually — don't just use keywords. E.g. 'How is authentication configured?' rather than 'auth config'.",
        },
        spaceId: {
          type: "string",
          description:
            "Scope search to a specific space. Both space-scoped and global memories are searched by default.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter results to memories with any of these tags (OR logic).",
        },
        limit: {
          type: "number",
          description:
            "Max results (1-50). Default: 10. Use higher limits when exploring a broad topic.",
        },
        type: {
          type: "string",
          enum: ["fact", "decision", "preference", "context", "learning"],
          description: "Filter to a specific memory type.",
        },
        mode: {
          type: "string",
          enum: ["keyword", "semantic", "hybrid"],
          description:
            'Search mode. "keyword" uses full-text search, "semantic" uses AI embeddings to understand meaning, "hybrid" (default) combines both for best results. Falls back to keyword if embeddings are unavailable.',
        },
        globalScope: {
          type: "boolean",
          description:
            "When true and spaceId is set, also include global (non-space) memories. Default: false.",
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
        spaceId: {
          type: "string",
          description: "Filter to memories in a specific space. Omit to list all memories.",
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
        type: {
          type: "string",
          enum: ["fact", "decision", "preference", "context", "learning"],
          description: "Filter to a specific memory type.",
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
        spaceId: {
          type: ["string", "null"],
          description:
            "Move to a different space, or null to make it global. Only provide if changing space scope.",
        },
        type: {
          type: "string",
          enum: ["fact", "decision", "preference", "context", "learning"],
          description: "Change the memory type classification.",
        },
        importance: {
          type: "number",
          description: "Update importance (0.0-1.0).",
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
        spaceId: args.spaceId as string | undefined,
        source: args.source as string | undefined,
        type: args.type as string | undefined,
        importance: args.importance as number | undefined,
      })

    case "search_memories": {
      const mode = (args.mode as string) ?? "hybrid"

      // Use hybrid search action for semantic/hybrid modes
      if (mode === "semantic" || mode === "hybrid") {
        return await client.action(api.memories.hybridSearch, {
          apiKeyHash,
          query: args.query as string,
          spaceId: args.spaceId as string | undefined,
          tags: args.tags as string[] | undefined,
          limit: args.limit as number | undefined,
          type: args.type as string | undefined,
          mode: mode as "keyword" | "semantic" | "hybrid",
          globalScope: args.globalScope as boolean | undefined,
        })
      }

      // Keyword-only: use the query (faster, no embedding needed)
      return await client.query(api.memories.search, {
        apiKeyHash,
        query: args.query as string,
        spaceId: args.spaceId as string | undefined,
        tags: args.tags as string[] | undefined,
        limit: args.limit as number | undefined,
        type: args.type as string | undefined,
      })
    }

    case "list_memories":
      return await client.query(api.memories.listMemories, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        tags: args.tags as string[] | undefined,
        limit: args.limit as number | undefined,
        type: args.type as string | undefined,
      })

    case "update_memory":
      return await client.mutation(api.memories.update, {
        apiKeyHash,
        id: args.id as string,
        content: args.content as string | undefined,
        tags: args.tags as string[] | undefined,
        spaceId: args.spaceId as string | null | undefined,
        type: args.type as string | undefined,
        importance: args.importance as number | undefined,
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
