import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

export const memoryTools: Tool[] = [
  {
    name: "add_memory",
    description:
      "Store a new memory. Memories are pieces of context, decisions, learnings, or notes that persist across sessions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The memory content (max 10,000 chars)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: 'Tags for categorization (e.g. ["architecture", "decision"])',
        },
        projectId: { type: "string", description: "Associate with a project" },
        source: {
          type: "string",
          description: 'Where this memory came from (e.g. "claude-code", "cursor", "manual")',
        },
      },
      required: ["content"],
    },
  },
  {
    name: "search_memories",
    description: "Search memories by content using full-text search.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (full-text search)" },
        projectId: { type: "string", description: "Scope search to a project" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        limit: {
          type: "number",
          description: "Max results (1-50). Default: 10",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_memories",
    description: "List recent memories, optionally filtered by project or tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "Filter by project" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        limit: {
          type: "number",
          description: "Max results (1-100). Default: 20",
        },
      },
    },
  },
  {
    name: "update_memory",
    description: "Update a memory's content or tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The memory ID" },
        content: { type: "string", description: "New content" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Replace tags",
        },
        projectId: {
          type: ["string", "null"],
          description: "Move to a different project, or null to unscope",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_memory",
    description: "Delete a memory.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The memory ID" },
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
