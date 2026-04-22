import { basename } from "node:path"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { detectWorkspace } from "../workspace.js"
import { generateSetupInstructions } from "./setup-instructions.js"
import { buildContextWorkflowHint } from "./workflow-hints.js"

/** Derive a space name from workspace path or repo URL */
function deriveSpaceName(workspacePath?: string, repoUrl?: string): string {
  if (repoUrl) {
    // "https://github.com/org/my-repo.git" -> "my-repo"
    const match = repoUrl.match(/\/([^/]+?)(?:\.git)?$/)
    if (match) return match[1]
  }
  if (workspacePath) {
    // "/Users/tim/code/my-project" -> "my-project"
    return basename(workspacePath)
  }
  return "My Space"
}

export const contextTools: Tool[] = [
  {
    name: "get_context",
    description:
      "CALL THIS FIRST at the start of every session. Returns everything you need to get oriented: active space (auto-detected from workspace if linked), pending tasks, recent memories (space-scoped + global), space list, space config (workflow statuses, labels, members, estimate scale), AI persona instructions, active cycle, and memory settings. This is your primary way to load context from previous sessions — it includes the most relevant stored memories so you can pick up where you or another agent left off. If this is your first session and no space exists, one will be auto-created from the current workspace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description:
            "Get context for a specific space. If omitted, auto-detects from the current workspace (if linked) or falls back to the default space.",
        },
        taskLimit: {
          type: "number",
          description: "Max pending tasks to return. Default: 10",
        },
        memoryLimit: {
          type: "number",
          description: "Max recent memories to return. Default: 5",
        },
      },
    },
  },
  {
    name: "get_setup_instructions",
    description:
      "Get CLAUDE.md instructions for configuring AI agents to use dodev.ai proactively. Returns a markdown section you should add to the workspace's CLAUDE.md file. If a space is linked or specified, the instructions include space-specific context (name, slug, ID). Call this after setting up dodev.ai in a new space, or when you need to add/update dodev.ai instructions in CLAUDE.md.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spaceId: {
          type: "string",
          description:
            "Get instructions for a specific space. If omitted, auto-detects from the current workspace (if linked). Falls back to generic instructions if no space is found.",
        },
      },
    },
  },
]

export async function handleContextTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "get_context": {
      // Auto-detect workspace info if no explicit spaceId
      const workspace = !args.spaceId ? detectWorkspace() : undefined

      const context = (await client.query(api.spaces.getContext, {
        apiKeyHash,
        spaceId: args.spaceId as string | undefined,
        taskLimit: args.taskLimit as number | undefined,
        memoryLimit: args.memoryLimit as number | undefined,
        workspacePath: workspace?.workspacePath,
        repoUrl: workspace?.repoUrl,
      })) as Record<string, unknown>

      // Add workflow hints if space has statuses
      const activeSpace = context.activeSpace as {
        statuses?: { id: string; name: string; category: string }[]
      } | null
      if (activeSpace?.statuses?.length) {
        context.agentWorkflow = buildContextWorkflowHint(activeSpace.statuses)
      }

      // Auto-create a space if the user has none
      if (!context.activeSpace && Array.isArray(context.spaces) && context.spaces.length === 0) {
        const spaceName = deriveSpaceName(workspace?.workspacePath, workspace?.repoUrl)

        const newSpace = (await client.mutation(api.spaces.create, {
          apiKeyHash,
          name: spaceName,
          description: `Auto-created from workspace: ${workspace?.workspacePath ?? "unknown"}`,
        })) as { _id: string } | null

        if (newSpace) {
          // Link workspace path and repo to the new space
          if (workspace?.workspacePath || workspace?.repoUrl) {
            await client
              .mutation(api.spaces.linkSpace, {
                apiKeyHash,
                spaceId: newSpace._id,
                path: workspace?.workspacePath,
                repo: workspace?.repoUrl,
              })
              .catch(() => {
                // Non-critical — linking failed but space was created
              })
          }

          // Set as default space
          await client
            .mutation(api.users.setDefaultSpace, {
              apiKeyHash,
              spaceId: newSpace._id,
            })
            .catch(() => {
              // Non-critical
            })

          // Re-query context with the new space
          const newContext = (await client.query(api.spaces.getContext, {
            apiKeyHash,
            spaceId: newSpace._id,
            taskLimit: args.taskLimit as number | undefined,
            memoryLimit: args.memoryLimit as number | undefined,
            workspacePath: workspace?.workspacePath,
            repoUrl: workspace?.repoUrl,
          })) as Record<string, unknown>

          const newActiveSpace = newContext.activeSpace as {
            statuses?: { id: string; name: string; category: string }[]
          } | null
          if (newActiveSpace?.statuses?.length) {
            newContext.agentWorkflow = buildContextWorkflowHint(newActiveSpace.statuses)
          }

          return newContext
        }
      }

      return context
    }

    case "get_setup_instructions": {
      let space: { name: string; slug: string; _id: string } | null = null

      if (args.spaceId) {
        // Explicit space ID provided
        try {
          space = (await client.query(api.spaces.get, {
            apiKeyHash,
            id: args.spaceId as string,
          })) as { name: string; slug: string; _id: string } | null
        } catch {
          // Space not found — fall through to generic instructions
        }
      } else {
        // Try workspace auto-detection
        const workspace = detectWorkspace()
        if (workspace.workspacePath || workspace.repoUrl) {
          try {
            space = (await client.query(api.spaces.resolveSpaceByWorkspace, {
              apiKeyHash,
              workspacePath: workspace.workspacePath,
              repoUrl: workspace.repoUrl,
            })) as { name: string; slug: string; _id: string } | null
          } catch {
            // No linked space — fall through to generic instructions
          }
        }
      }

      const instructions = generateSetupInstructions(
        space
          ? {
              spaceName: space.name,
              spaceSlug: space.slug,
              spaceId: space._id,
            }
          : undefined
      )

      return {
        instructions,
        space: space
          ? {
              spaceName: space.name,
              spaceSlug: space.slug,
              spaceId: space._id,
            }
          : null,
      }
    }

    default:
      throw new Error(`Unknown context tool: ${name}`)
  }
}
