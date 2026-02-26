import { basename } from "node:path"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"
import { detectWorkspace } from "../workspace.js"
import { generateSetupInstructions } from "./setup-instructions.js"
import { buildContextWorkflowHint } from "./workflow-hints.js"

/** Derive a project name from workspace path or repo URL */
function deriveProjectName(workspacePath?: string, repoUrl?: string): string {
  if (repoUrl) {
    // "https://github.com/org/my-repo.git" -> "my-repo"
    const match = repoUrl.match(/\/([^/]+?)(?:\.git)?$/)
    if (match) return match[1]
  }
  if (workspacePath) {
    // "/Users/tim/code/my-project" -> "my-project"
    return basename(workspacePath)
  }
  return "My Project"
}

export const contextTools: Tool[] = [
  {
    name: "get_context",
    description:
      "CALL THIS FIRST at the start of every session. Returns everything you need to get oriented: active project (auto-detected from workspace if linked), pending tasks, recent memories (project-scoped + global), project list, project config (workflow statuses, labels, members, estimate scale), AI persona instructions, active cycle, and memory settings. This is your primary way to load context from previous sessions — it includes the most relevant stored memories so you can pick up where you or another agent left off. If this is your first session and no project exists, one will be auto-created from the current workspace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description:
            "Get context for a specific project. If omitted, auto-detects from the current workspace (if linked) or falls back to the default project.",
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
      "Get CLAUDE.md instructions for configuring AI agents to use dodev.ai proactively. Returns a markdown section you should add to the project's CLAUDE.md file. If a project is linked or specified, the instructions include project-specific context (name, slug, ID). Call this after setting up dodev.ai in a new project, or when you need to add/update dodev.ai instructions in CLAUDE.md.",
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

      const context = await client.query(api.projects.getContext, {
        apiKeyHash,
        projectId: args.projectId as string | undefined,
        taskLimit: args.taskLimit as number | undefined,
        memoryLimit: args.memoryLimit as number | undefined,
        workspacePath: workspace?.workspacePath,
        repoUrl: workspace?.repoUrl,
      }) as Record<string, unknown>

      // Add workflow hints if project has statuses
      const activeProject = context.activeProject as {
        statuses?: { id: string; name: string; category: string }[]
      } | null
      if (activeProject?.statuses?.length) {
        context.agentWorkflow = buildContextWorkflowHint(activeProject.statuses)
      }

      // Auto-create a project if the user has none
      if (!context.activeProject && Array.isArray(context.projects) && context.projects.length === 0) {
        const projectName = deriveProjectName(workspace?.workspacePath, workspace?.repoUrl)

        const newProject = await client.mutation(api.projects.create, {
          apiKeyHash,
          name: projectName,
          description: `Auto-created from workspace: ${workspace?.workspacePath ?? "unknown"}`,
        }) as { _id: string } | null

        if (newProject) {
          // Link workspace path and repo to the new project
          if (workspace?.workspacePath || workspace?.repoUrl) {
            await client.mutation(api.projects.linkProject, {
              apiKeyHash,
              projectId: newProject._id,
              path: workspace?.workspacePath,
              repo: workspace?.repoUrl,
            }).catch(() => {
              // Non-critical — linking failed but project was created
            })
          }

          // Set as default project
          await client.mutation(api.users.setDefaultProject, {
            apiKeyHash,
            projectId: newProject._id,
          }).catch(() => {
            // Non-critical
          })

          // Re-query context with the new project
          const newContext = await client.query(api.projects.getContext, {
            apiKeyHash,
            projectId: newProject._id,
            taskLimit: args.taskLimit as number | undefined,
            memoryLimit: args.memoryLimit as number | undefined,
            workspacePath: workspace?.workspacePath,
            repoUrl: workspace?.repoUrl,
          }) as Record<string, unknown>

          const newActiveProject = newContext.activeProject as {
            statuses?: { id: string; name: string; category: string }[]
          } | null
          if (newActiveProject?.statuses?.length) {
            newContext.agentWorkflow = buildContextWorkflowHint(newActiveProject.statuses)
          }

          return newContext
        }
      }

      return context
    }

    case "get_setup_instructions": {
      let project: { name: string; slug: string; _id: string } | null = null

      if (args.projectId) {
        // Explicit project ID provided
        try {
          project = (await client.query(api.projects.get, {
            apiKeyHash,
            id: args.projectId as string,
          })) as { name: string; slug: string; _id: string } | null
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
            })) as { name: string; slug: string; _id: string } | null
          } catch {
            // No linked project — fall through to generic instructions
          }
        }
      }

      const instructions = generateSetupInstructions(
        project
          ? {
              projectName: project.name,
              projectSlug: project.slug,
              projectId: project._id,
            }
          : undefined
      )

      return {
        instructions,
        project: project
          ? {
              projectName: project.name,
              projectSlug: project.slug,
              projectId: project._id,
            }
          : null,
      }
    }

    default:
      throw new Error(`Unknown context tool: ${name}`)
  }
}
