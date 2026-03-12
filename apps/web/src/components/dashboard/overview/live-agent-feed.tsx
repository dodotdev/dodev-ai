"use client"

import { cn } from "@/lib/utils"

interface McpLog {
  _id: string
  tool: string
  args?: Record<string, unknown>
  status: "ok" | "error"
  errorCode?: string
  errorMessage?: string
  durationMs: number
  spaceId?: string
  createdAt: number
}

function toolCategory(tool: string): string {
  if (
    tool.startsWith("create_task") ||
    tool.startsWith("update_task") ||
    tool.startsWith("complete_task") ||
    tool.startsWith("list_task") ||
    tool.startsWith("get_task") ||
    tool.startsWith("delete_task")
  )
    return "task"
  if (tool.includes("issue")) return "issue"
  if (tool.includes("memory") || tool === "add_memory" || tool === "search_memories")
    return "memory"
  if (tool.includes("project") || tool.includes("space")) return "space"
  if (tool.includes("cycle")) return "cycle"
  if (tool.includes("context") || tool === "get_context" || tool === "get_setup_instructions")
    return "context"
  if (tool.includes("link") || tool.includes("unlink")) return "linking"
  return "config"
}

const categoryDotColors: Record<string, string> = {
  task: "bg-blue-400",
  issue: "bg-orange-400",
  memory: "bg-purple-400",
  space: "bg-emerald-400",
  cycle: "bg-cyan-400",
  context: "bg-zinc-400",
  linking: "bg-indigo-400",
  config: "bg-amber-400",
}

/** Extract a short summary from tool args for inline display */
function extractInlineContent(tool: string, args?: Record<string, unknown>): string | null {
  if (!args) return null
  if (args.title && typeof args.title === "string") return args.title
  if (args.name && typeof args.name === "string") return args.name
  if (args.content && typeof args.content === "string") {
    const text = args.content as string
    return text.length > 60 ? `${text.slice(0, 60)}...` : text
  }
  if (args.query && typeof args.query === "string") return `"${args.query}"`
  if (tool === "get_context") return null
  return null
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

interface LiveAgentFeedProps {
  logs: McpLog[] | undefined
}

export function LiveAgentFeed({ logs }: LiveAgentFeedProps) {
  const entries = logs ?? []

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Agent Activity</h2>
          {entries.length > 0 && (
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {entries.length}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <span className="text-[10px] text-muted-foreground">MCP tool calls</span>
        )}
      </div>

      {/* Feed body */}
      <div className="relative max-h-[400px] overflow-y-auto scrollbar-autohide">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              Waiting for agent activity
              <span className="inline-block w-2 animate-pulse ml-0.5 text-foreground/40">_</span>
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              Tool calls from connected AI agents will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-zinc-800/60">
            {entries.map((log) => {
              const cat = toolCategory(log.tool)
              const inline = extractInlineContent(log.tool, log.args)
              return (
                <div
                  key={log._id}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  {/* Timestamp */}
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/60">
                    {formatTime(log.createdAt)}
                  </span>

                  {/* Category dot */}
                  <span className={cn("size-2 shrink-0 rounded-full", categoryDotColors[cat])} />

                  {/* Tool name */}
                  <code className="shrink-0 font-mono text-xs text-foreground">{log.tool}</code>

                  {/* Inline content */}
                  {inline && (
                    <span className="truncate text-xs text-muted-foreground">{inline}</span>
                  )}

                  {/* Spacer */}
                  <span className="flex-1" />

                  {/* Duration */}
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                    {log.durationMs}ms
                  </span>

                  {/* Status dot */}
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      log.status === "ok" ? "bg-emerald-500" : "bg-red-500"
                    )}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom gradient fade */}
        {entries.length > 8 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
        )}
      </div>
    </div>
  )
}
