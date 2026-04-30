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
        projectId: {
          type: "string",
          description:
            "Associate with a specific project inside a space (v0.1.0+). Search at any scope sees narrower AND broader memories via bubble-up (project search includes space + global; space search includes all-projects + global).",
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
            "Scope search to a specific space. Bubble-up (default: on) includes memories at any scope within that space plus global. Set bubbleUp: false for strict scope.",
        },
        projectId: {
          type: "string",
          description:
            "Scope search to a specific project (v0.1.0+). When set together with spaceId, projectId wins. With bubble-up on (default), the search sees project + parent-space + global memories.",
        },
        bubbleUp: {
          type: "boolean",
          description:
            "Include memories from broader/narrower scopes per the bubble-up rules. Default: true. Set to false for a strict scope-only search.",
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
      "List recent memories in chronological order. Use this to review what's been stored recently, audit memory quality, or browse memories by space, project, or tag. For finding specific information, prefer search_memories instead.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description: "Filter to memories in a specific space. Omit to list all memories.",
        },
        projectId: {
          type: "string",
          description: "Filter to memories in a specific project (v0.1.0+). Wins over spaceId.",
        },
        bubbleUp: {
          type: "boolean",
          description:
            "Include memories from broader/narrower scopes per the bubble-up rules. Default: true.",
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
      "Update a memory when information changes or becomes more complete. Use this to correct outdated facts, add detail to a sparse memory, or re-tag memories for better organization. Prefer updating over creating duplicates — if a memory about the same topic already exists, update it rather than adding a new one. To indicate that an existing memory proved true again, use reinforce_memory instead. To replace one memory with a new one (keeping audit trail), use supersede_memory.",
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
        lifecycleStatus: {
          type: "string",
          enum: ["active", "deprecated"],
          description:
            "Manually mark active or deprecated. Deprecated memories are excluded from memory_digest. Most callers should use supersede_memory instead — this is an escape hatch.",
        },
        digestRank: {
          type: ["number", "null"],
          description:
            "Manual digest ordering override. Higher values surface sooner. Pass null to clear. Use sparingly — reinforcement count and recency normally suffice.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "reinforce_memory",
    description:
      "Bump the reinforcement counter on a memory. Call this when an existing memory proves true again — for example, you just relied on a stored architectural fact and it was correct, or a captured user preference held up in a new context. Reinforced memories surface higher in memory_digest. ALWAYS prefer reinforce_memory over creating a duplicate memory about the same topic.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The memory ID to reinforce." },
        note: {
          type: "string",
          description:
            "Optional one-line note about the context in which this proved true again. Currently informational only.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "supersede_memory",
    description:
      "Replace an outdated memory with a new one. The old memory is marked deprecated (kept for audit) and the new one stores a `supersedes` link back to it. Use this instead of update_memory when the underlying fact has fundamentally changed (e.g. status IDs were rotated, an architectural decision was reversed). Either pass `newId` to link an already-created memory, or pass `content` to create the replacement inline.",
    inputSchema: {
      type: "object" as const,
      properties: {
        oldId: { type: "string", description: "The memory ID to deprecate." },
        newId: {
          type: "string",
          description:
            "An existing memory ID to mark as the replacement. Provide either this OR content (not both).",
        },
        content: {
          type: "string",
          description:
            "If creating the replacement inline, the new content. Inherits scope and source from the old memory.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Tags for the new memory (only if creating inline). Defaults to the old memory's tags.",
        },
        type: {
          type: "string",
          enum: ["fact", "decision", "preference", "context", "learning"],
          description: "Type for the new memory (only if creating inline).",
        },
      },
      required: ["oldId"],
    },
  },
  {
    name: "memory_digest",
    description:
      "Get a compact, rank-ordered summary of active memories for the current scope. Designed for session-start prompt injection: high-signal, low-volume, surfaces the most relevant durable knowledge. Ranking favors heavily-reinforced memories, recently-validated ones, and memories with manual digestRank overrides. Deprecated memories are excluded. Call this at session start (alongside get_context) to ground yourself in what's already known. Different shape than search_memories — search is query-driven; digest is 'give me the important stuff right now.'",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description:
            "Scope to a specific space. Bubble-up (default: on) includes the space's projects and global memories.",
        },
        projectId: {
          type: "string",
          description:
            "Scope to a specific project. With bubble-up on, includes parent space and global memories too.",
        },
        bubbleUp: {
          type: "boolean",
          description: "Include broader/narrower scopes per the bubble-up rules. Default: true.",
        },
        type: {
          type: "string",
          enum: ["fact", "decision", "preference", "context", "learning"],
          description: "Filter to a single memory type.",
        },
        minReinforcements: {
          type: "number",
          description:
            "Only include memories reinforced at least this many times. Default: 0 (all active). Useful for a 'must-know' digest.",
        },
        limit: {
          type: "number",
          description: "Max entries (1-50). Default: 20.",
        },
      },
    },
  },
  {
    name: "delete_memory",
    description:
      "Permanently delete a memory. Use sparingly — only for memories that are clearly wrong, duplicated, or no longer relevant. When in doubt, prefer supersede_memory (keeps audit trail) or update_memory (correct in place).",
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
        projectId: args.projectId as string | undefined,
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
          projectId: args.projectId as string | undefined,
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
        projectId: args.projectId as string | undefined,
        bubbleUp: args.bubbleUp as boolean | undefined,
        tags: args.tags as string[] | undefined,
        limit: args.limit as number | undefined,
        type: args.type as string | undefined,
      })
    }

    case "list_memories":
      return await client.query(api.memories.listMemories, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        bubbleUp: args.bubbleUp as boolean | undefined,
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
        lifecycleStatus: args.lifecycleStatus as "active" | "deprecated" | undefined,
        digestRank: args.digestRank as number | null | undefined,
      })

    case "reinforce_memory":
      return await client.mutation(api.memories.reinforce, {
        apiKeyHash,
        id: args.id as string,
        note: args.note as string | undefined,
      })

    case "supersede_memory":
      return await client.mutation(api.memories.supersede, {
        apiKeyHash,
        oldId: args.oldId as string,
        newId: args.newId as string | undefined,
        content: args.content as string | undefined,
        tags: args.tags as string[] | undefined,
        type: args.type as string | undefined,
      })

    case "memory_digest":
      return await client.query(api.memories.digest, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        projectId: args.projectId as string | undefined,
        bubbleUp: args.bubbleUp as boolean | undefined,
        type: args.type as string | undefined,
        minReinforcements: args.minReinforcements as number | undefined,
        limit: args.limit as number | undefined,
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
