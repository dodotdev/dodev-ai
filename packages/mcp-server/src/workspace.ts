import { readFileSync } from "node:fs"
import { resolve } from "node:path"

interface WorkspaceInfo {
  workspacePath: string | undefined
  repoUrl: string | undefined
}

let cached: WorkspaceInfo | null = null

/** Detect workspace path and git remote URL from the environment */
export function detectWorkspace(): WorkspaceInfo {
  if (cached) return cached

  const workspacePath = process.env.DOMCP_WORKSPACE || process.env.PWD || undefined

  let repoUrl: string | undefined
  if (workspacePath) {
    repoUrl = readGitRemote(workspacePath)
  }

  cached = { workspacePath, repoUrl }
  return cached
}

/** Read the git remote origin URL from .git/config */
function readGitRemote(dir: string): string | undefined {
  try {
    const gitConfigPath = resolve(dir, ".git", "config")
    const content = readFileSync(gitConfigPath, "utf-8")

    // Parse [remote "origin"] section
    const remoteMatch = content.match(
      /\[remote\s+"origin"\]\s*\n(?:\s+[^\n]*\n)*?\s+url\s*=\s*(.+)/
    )
    if (remoteMatch) {
      return remoteMatch[1].trim()
    }
  } catch {
    // Not a git repo or can't read .git/config
  }
  return undefined
}
