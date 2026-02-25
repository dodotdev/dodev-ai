import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { detectWorkspace } from "../workspace.js"
import { generateSetupInstructions } from "./setup-instructions.js"

export const contextTools: Tool[] = [
  {
    name: "get_context",
    description:
      "CALL THIS FIRST at the start of every session. Returns everything you need to get oriented: active project (auto-detected from workspace if linked), pending todos, recent memories (project-scoped + global), project list, project config (workflow statuses, labels, members, estimate scale), AI persona instructions, active cycle, and memory settings. This is your primary way to load context from previous sessions — it includes the most relevant stored memories so you can pick up where you or another agent left off.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description:
            "Get context for a specific project. If omitted, auto-detects from the current workspace (if linked) or falls back to the default project.",
        },
        todoLimit: {
          type: "number",
          description: "Max pending todos to return. Default: 10",
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
      "Get CLAUDE.md instructions for configuring AI agents to use DoMCP proactively. Returns a markdown section you should add to the project's CLAUDE.md file. If a project is linked or specified, the instructions include project-specific context (name, stub, ID). Call this after setting up DoMCP in a new project, or when you need to add/update DoMCP instructions in CLAUDE.md.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description:
            "Get instructions for a specific project. If omitted, auto-detects from the current workspace (if linked). Falls back to generic instructions if no project is found.",
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
      // Auto-detect workspace info if no explicit projectId
      const workspace = !args.projectId ? detectWorkspace() : undefined

      return await client.query(api.projects.getContext, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        todoLimit: args.todoLimit as number | undefined,
        memoryLimit: args.memoryLimit as number | undefined,
        workspacePath: workspace?.workspacePath,
        repoUrl: workspace?.repoUrl,
      })
    }

    case "get_setup_instructions": {
      let project: { name: string; stub: string; _id: string } | null = null

      if (args.projectId) {
        // Explicit project ID provided
        try {
          project = (await client.query(api.projects.get, {
            apiKeyHash,
            id: args.projectId as string,
          })) as { name: string; stub: string; _id: string } | null
        } catch {
          // Project not found — fall through to generic instructions
        }
      } else {
        // Try workspace auto-detection
        const workspace = detectWorkspace()
        if (workspace.workspacePath || workspace.repoUrl) {
          try {
            project = (await client.query(api.projects.resolveProjectByWorkspace, {
              apiKeyHash,
              workspacePath: workspace.workspacePath,
              repoUrl: workspace.repoUrl,
            })) as { name: string; stub: string; _id: string } | null
          } catch {
            // No linked project — fall through to generic instructions
          }
        }
      }

      const instructions = generateSetupInstructions(
        project
          ? {
              projectName: project.name,
              projectStub: project.stub,
              projectId: project._id,
            }
          : undefined
      )

      return {
        instructions,
        project: project
          ? {
              projectName: project.name,
              projectStub: project.stub,
              projectId: project._id,
            }
          : null,
      }
    }

    default:
      throw new Error(`Unknown context tool: ${name}`)
  }
}
