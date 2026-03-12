"use client"

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderPlus,
  Loader2,
  Lock,
  MessageSquare,
  Plug,
  Rocket,
  Terminal,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MCP_URL = "https://cloud.dodev.ai/mcp"

type ClientTab = "claude-code" | "cursor" | "vscode" | "windsurf"

const CLIENT_TABS: { id: ClientTab; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "vscode", label: "VS Code" },
  { id: "windsurf", label: "Windsurf" },
]

const ESSENTIAL_COMMANDS = [
  {
    command: "get_context",
    description: "Load your space context at the start of each session",
  },
  {
    command: "create_task",
    description: "Track work items with priorities and statuses",
  },
  {
    command: "add_memory",
    description: "Store decisions, facts, and learnings",
  },
  {
    command: "search_memories",
    description: "Recall past context across sessions",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMcpJson(): string {
  return JSON.stringify(
    {
      mcpServers: {
        dodev: {
          type: "http",
          url: MCP_URL,
        },
      },
    },
    null,
    2
  )
}

// ---------------------------------------------------------------------------
// Copy Button
// ---------------------------------------------------------------------------

function CopyButton({
  text,
  className,
  label = "Copy",
}: {
  text: string
  className?: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
        copied
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
        className
      )}
      aria-label={label}
    >
      {copied ? (
        <>
          <CheckCircle2 className="size-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy
        </>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Code Block
// ---------------------------------------------------------------------------

function CodeBlock({
  code,
  copyText,
  language,
}: {
  code: string
  copyText?: string
  language?: string
}) {
  return (
    <div className="relative">
      <pre
        className={cn(
          "overflow-x-auto rounded-lg bg-zinc-950 p-4 text-[12px] leading-relaxed font-mono",
          language === "json" ? "text-emerald-300" : "text-zinc-300"
        )}
      >
        {code}
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton
          text={copyText ?? code}
          className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          label="Copy code"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step Wrapper
// ---------------------------------------------------------------------------

function Step({
  number,
  icon: Icon,
  title,
  isLast,
  children,
}: {
  number: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  isLast?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative flex gap-5">
      {/* Timeline: circle + connector line */}
      <div className="flex flex-col items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <span className="text-sm font-bold tabular-nums">{number}</span>
        </div>
        {!isLast && <div className="mt-3 w-px flex-1 bg-border" />}
      </div>

      {/* Card */}
      <div className="min-w-0 flex-1 pb-10">
        <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card sm:p-6">
          <div className="flex items-center gap-2.5">
            <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Connect MCP Client
// ---------------------------------------------------------------------------

function ConnectClientStep() {
  const [activeTab, setActiveTab] = useState<ClientTab>("claude-code")

  const mcpJson = buildMcpJson()
  const claudeCommand = `claude mcp add dodev --transport http ${MCP_URL}`

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        dodev.ai uses the MCP HTTP transport. Choose your AI tool below and add the server
        configuration.
      </p>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/80">
        {CLIENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === "claude-code" && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Run the following command in your terminal:
            </p>
            <CodeBlock code={claudeCommand} copyText={claudeCommand} language="bash" />
          </>
        )}

        {activeTab === "cursor" && (
          <>
            <p className="mb-3 text-sm font-medium">Option 1: Cursor UI</p>
            <div className="space-y-2.5">
              <div className="flex gap-3 rounded-lg border border-border bg-zinc-50 px-4 py-3 dark:bg-zinc-900/50">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  1
                </span>
                <p className="text-sm text-muted-foreground">
                  Open Settings (
                  <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700">
                    Cmd + ,
                  </code>
                  ) &rarr; <strong className="text-foreground">Tools &amp; MCP</strong> (or Features
                  &rarr; MCP)
                </p>
              </div>
              <div className="flex gap-3 rounded-lg border border-border bg-zinc-50 px-4 py-3 dark:bg-zinc-900/50">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  2
                </span>
                <p className="text-sm text-muted-foreground">
                  Click{" "}
                  <strong className="text-foreground">&ldquo;Add new MCP server&rdquo;</strong>
                </p>
              </div>
              <div className="flex gap-3 rounded-lg border border-border bg-zinc-50 px-4 py-3 dark:bg-zinc-900/50">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  3
                </span>
                <div className="text-sm text-muted-foreground">
                  Fill in:
                  <ul className="mt-1.5 ml-4 list-disc space-y-1">
                    <li>
                      <strong className="text-foreground">Name:</strong> dodev
                    </li>
                    <li>
                      <strong className="text-foreground">Type:</strong> SSE (HTTP/cloud)
                    </li>
                    <li>
                      <strong className="text-foreground">URL:</strong>{" "}
                      <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700">
                        {MCP_URL}
                      </code>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-border bg-zinc-50 px-4 py-3 dark:bg-zinc-900/50">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  4
                </span>
                <p className="text-sm text-muted-foreground">
                  Click <strong className="text-foreground">Install</strong>, then{" "}
                  <strong className="text-foreground">restart Cursor</strong>
                </p>
              </div>
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <p className="mb-3 text-sm font-medium">Option 2: JSON config</p>
            <p className="mb-3 text-sm text-muted-foreground">
              Create or edit{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700">
                .cursor/mcp.json
              </code>{" "}
              in your project root:
            </p>
            <CodeBlock code={mcpJson} copyText={mcpJson} language="json" />
          </>
        )}

        {activeTab === "vscode" && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Add the following to{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700">
                .vscode/mcp.json
              </code>{" "}
              in your project root:
            </p>
            <CodeBlock code={mcpJson} copyText={mcpJson} language="json" />
          </>
        )}

        {activeTab === "windsurf" && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Create or edit your Windsurf MCP configuration file with the following:
            </p>
            <CodeBlock code={mcpJson} copyText={mcpJson} language="json" />
          </>
        )}
      </div>

      {activeTab !== "claude-code" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Tip:</span> You can also place the config in your home
            directory (
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/50">
              ~/.cursor/mcp.json
            </code>
            ) for global access across all projects.
            {activeTab === "cursor" && " Restart Cursor after any config change."}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Authenticate
// ---------------------------------------------------------------------------

function AuthenticateStep() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        After adding the server config, you need to authenticate to connect.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-border bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <div className="flex gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/50 dark:text-emerald-300">
              1
            </div>
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                In Claude Code, type{" "}
                <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground dark:bg-zinc-700">
                  /mcp
                </code>{" "}
                and select <strong className="text-foreground">dodev</strong> to initiate the
                connection
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Other MCP clients may connect automatically or have their own connection flow.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <div className="flex gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/50 dark:text-emerald-300">
              2
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A browser window will open &mdash; sign in with the same account you registered with
              (Google, GitHub, or email)
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <div className="flex gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/50 dark:text-emerald-300">
              3
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After signing in, the browser redirects back and your MCP client is connected.
              You&apos;ll stay authenticated for up to a week.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <span className="font-semibold">No API keys needed.</span> dodev.ai uses OAuth 2.1 for
          authentication. No tokens to copy or manage &mdash; just sign in and go.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Create Space
// ---------------------------------------------------------------------------

function CreateSpaceStep() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Once connected, tell your AI agent to create a space. Spaces organize your tasks, issues,
        and memories.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Agent option (primary) */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-medium">Ask your AI agent</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Just tell your agent what to do in plain language:
          </p>
          <div className="mt-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-800 dark:bg-zinc-900">
            <p className="text-sm italic text-foreground">
              &ldquo;Create a dodev space called My App&rdquo;
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            The agent will call{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">
              create_space
            </code>{" "}
            via MCP automatically.
          </p>
        </div>

        {/* Dashboard option */}
        <div className="rounded-xl border border-border bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <FolderPlus className="size-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-medium">From Dashboard</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Or use the Spaces page to create and configure your first space with a UI.
          </p>
          <Link
            href="/dashboard/spaces"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            Go to Spaces
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Start Building
// ---------------------------------------------------------------------------

function StartBuildingStep() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Your agent now has access to all dodev.ai MCP tools. Here are the most useful ones to start
        with:
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ESSENTIAL_COMMANDS.map((cmd) => (
          <div
            key={cmd.command}
            className="rounded-xl border border-border bg-zinc-50 p-4 dark:bg-zinc-900/50"
          >
            <code className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {cmd.command}
            </code>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {cmd.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <a
          href="https://dodev.ai/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          Read Full Docs
          <ExternalLink className="size-3" />
        </a>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GettingStartedPage() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[800px]">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <Rocket className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Getting Started</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Connect your AI agent to dodev.ai in under 5 minutes
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div>
        <Step number={1} icon={Plug} title="Connect Your MCP Client">
          <ConnectClientStep />
        </Step>

        <Step number={2} icon={Lock} title="Authenticate">
          <AuthenticateStep />
        </Step>

        <Step number={3} icon={FolderPlus} title="Create Your First Space">
          <CreateSpaceStep />
        </Step>

        <Step number={4} icon={Terminal} title="Start Building" isLast>
          <StartBuildingStep />
        </Step>
      </div>
    </div>
  )
}
