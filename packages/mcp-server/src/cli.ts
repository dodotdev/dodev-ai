#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { generateApiKey, hashApiKey } from "./auth/api-key.js"
import { api, getConvexClient } from "./convex-client.js"

const command = process.argv[2]

async function main() {
  switch (command) {
    case "generate-key":
      await handleGenerateKey()
      break

    case "serve":
      // Import and run the main server
      await import("./index.js")
      break

    case "setup-skill":
      handleSetupSkill()
      break

    default:
      console.log(`dodev.ai CLI

Usage:
  dodev generate-key    Generate a new API key
  dodev serve           Start the MCP server
  dodev setup-skill     Install the /dodev Claude Code skill + hooks

Flags for setup-skill:
  --skip-hooks          Don't install PreCompact / SessionStart hooks

Environment variables:
  CONVEX_URL              Your Convex deployment URL (required)
  DODEV_API_KEY           Your API key (required for serve)
  DODEV_MODE              "self-hosted" (default) or "cloud"
`)
      break
  }
}

async function handleGenerateKey() {
  if (!process.env.CONVEX_URL) {
    console.error("Error: CONVEX_URL environment variable is required")
    console.error(
      "Set it to your Convex deployment URL (e.g., https://your-deployment.convex.cloud)"
    )
    process.exit(1)
  }

  const apiKey = generateApiKey()
  const apiKeyHash = hashApiKey(apiKey)

  console.log("\nGenerating new dodev.ai API key...\n")

  try {
    const client = getConvexClient()
    await client.mutation(api.users.createFromApiKey, {
      workosUserId: "self-hosted",
      email: "self-hosted@dodev.local",
      apiKey,
      apiKeyHash,
    })

    console.log("API key generated and stored in Convex.\n")
    console.log(`  DODEV_API_KEY=${apiKey}\n`)
    console.log("Add this to your .env file or MCP client configuration.")
    console.log("Keep this key secret — it cannot be retrieved again.\n")
  } catch (error) {
    console.error("Failed to store API key in Convex:", error)
    console.error("\nThe key was generated but not stored. You can manually add it:")
    console.log(`  API Key: ${apiKey}`)
    console.log(`  Hash:    ${apiKeyHash}`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// setup-skill (R5)
// ---------------------------------------------------------------------------

function handleSetupSkill() {
  const skipHooks = process.argv.includes("--skip-hooks")

  // 1. Resolve the bundled SKILL.md. The file ships in dist/skill/SKILL.md
  //    after build (see tsconfig copy + package.json files); in dev/source
  //    runs we read it from src/skill/SKILL.md relative to this file.
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, "skill", "SKILL.md"), // dist
    join(here, "..", "src", "skill", "SKILL.md"), // dev (compiled to dist/cli.js)
    join(here, "..", "..", "src", "skill", "SKILL.md"),
  ]
  const source = candidates.find((p) => existsSync(p))
  if (!source) {
    console.error("Error: SKILL.md not found in package. Reinstall @dodev/mcp-server.")
    process.exit(1)
  }
  const skillContent = readFileSync(source, "utf8")

  // 2. Install to ~/.claude/skills/dodev/SKILL.md
  const skillDir = join(homedir(), ".claude", "skills", "dodev")
  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true })
  }
  const targetSkill = join(skillDir, "SKILL.md")
  writeFileSync(targetSkill, skillContent, "utf8")
  console.log(`✓ Installed /dodev skill at ${targetSkill}`)

  // 3. Hooks. Read existing settings.json, merge in PreCompact +
  //    SessionStart entries that call `dodev` if not already present.
  if (!skipHooks) {
    installHooks()
  } else {
    console.log("✓ Skipped hooks (--skip-hooks)")
  }

  console.log("\nDone. Restart Claude Code, then type /dodev to prime your next session.")
}

function installHooks() {
  const settingsPath = join(homedir(), ".claude", "settings.json")
  let raw = "{}"
  if (existsSync(settingsPath)) {
    raw = readFileSync(settingsPath, "utf8")
  } else {
    mkdirSync(dirname(settingsPath), { recursive: true })
  }

  let settings: Record<string, unknown>
  try {
    settings = JSON.parse(raw) as Record<string, unknown>
  } catch (err) {
    console.error(
      `! ${settingsPath} is not valid JSON. Hook setup skipped — fix the file and re-run with --skip-hooks=false.`
    )
    console.error(err)
    return
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown>

  // Note: these are dodev.ai-tagged commands; we only add if no entry already
  // contains the tag. Re-running setup-skill is idempotent.
  const PRE_COMPACT_TAG = "# dodev:pre_compact"
  const SESSION_START_TAG = "# dodev:session_start"

  hooks.PreCompact = upsertHook(hooks.PreCompact, PRE_COMPACT_TAG, {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `${PRE_COMPACT_TAG}\nDODEV_TRIGGER=pre_compact dodev serve --hook take_snapshot 2>/dev/null || true`,
      },
    ],
  })

  hooks.SessionStart = upsertHook(hooks.SessionStart, SESSION_START_TAG, {
    matcher: "",
    hooks: [
      {
        type: "command",
        // SessionStart is informational only — print the recap to stdout for
        // the harness to inject. We tolerate failure (best-effort).
        command: `${SESSION_START_TAG}\necho "Run /dodev to load context."`,
      },
    ],
  })

  settings.hooks = hooks
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8")
  console.log(`✓ Updated hooks in ${settingsPath}`)
  console.log("  - PreCompact: take_snapshot before context compaction")
  console.log("  - SessionStart: prompt to run /dodev")
}

interface HookEntry {
  matcher?: string
  hooks?: Array<{ type: string; command: string }>
}

function upsertHook(existing: unknown, tag: string, entry: HookEntry): HookEntry[] {
  const list = Array.isArray(existing) ? (existing as HookEntry[]) : []
  // If any existing hook command already contains the tag, leave alone.
  const alreadyPresent = list.some((e) =>
    (e.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes(tag))
  )
  if (alreadyPresent) return list
  return [...list, entry]
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
