/**
 * 404 — rendered as a "memory not found" pseudo-row that styles like the
 * actual MemoryDigestPanel rows. Half the joke is the visual continuity
 * with the rest of the app: the agent has memories, and this URL just
 * isn't one of them.
 */
import { Link, useLocation } from "@tanstack/react-router"
import { Bot, Brain, Home, Loader2, Sparkles, ThumbsUp } from "lucide-react"
import { useEffect, useState } from "react"

const QUIPS: string[] = [
  "no memory of this URL",
  "the agent has no recollection of this page",
  "this route was never reinforced",
  "supersede() called on this URL — no replacement",
  "404: lifecycleStatus = 'deprecated'",
  "the handover didn't mention this",
  "blocker: page does not exist",
  "this URL has zero reinforcements",
  "no baseline snapshot of this page exists",
]

export function NotFoundPage() {
  const location = useLocation()
  const [quip, setQuip] = useState(QUIPS[0])
  const [reinforcements, setReinforcements] = useState(0)
  const [easter, setEaster] = useState(false)

  useEffect(() => {
    setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)])
  }, [])

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Hero — looks like a Memory Digest row gone wrong */}
        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-sm font-medium">Memory digest</span>
            <span className="text-xs text-muted-foreground">· top 0</span>
            <span className="ml-auto text-[11px] text-muted-foreground">404</span>
          </div>

          <div className="px-4 py-3">
            <div className="rounded-md border border-dashed border-border/60 bg-background px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReinforcements((r) => r + 1)
                      if (reinforcements + 1 >= 5) setEaster(true)
                    }}
                    aria-label="Reinforce this 404"
                    title="Reinforce: maybe if we click enough, the page will exist?"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <ThumbsUp className="size-3.5" />
                  </button>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {reinforcements}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{quip}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-gray-500/10 px-1.5 py-0.5 font-medium text-muted-foreground">
                      learning
                    </span>
                    <span className="font-mono">
                      {location.pathname}
                      {location.searchStr ? `?${location.searchStr}` : ""}
                    </span>
                    <span className="text-muted-foreground/70">404 · deprecated</span>
                  </div>
                </div>
              </div>
            </div>

            {easter && (
              <p className="mt-3 px-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Bot className="mr-1 inline size-3" />
                Reinforcement counter incremented {reinforcements} times. Sadly, the URL still
                doesn't exist. Even agents have limits.
              </p>
            )}
          </div>
        </div>

        {/* Big number + tagline */}
        <div className="flex items-end gap-4">
          <div className="font-mono text-6xl font-bold leading-none tracking-tight text-foreground/90 sm:text-7xl">
            4<GlitchO />4
          </div>
          <div className="pb-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Page not found</p>
            <p>
              You wandered out of the digest. Even our recap <Brain className="inline size-3" /> has
              nothing on this one.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Home className="size-3.5" />
            Back to dashboard
          </Link>
          <Link
            to="/dashboard/live"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Loader2 className="size-3.5" />
            Watch live agents
          </Link>
          <Link
            to="/dashboard/memories"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Sparkles className="size-3.5" />
            See memory digest
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * The middle 0 of "404" subtly glitches between an O and a 0. Pure
 * cosmetic, but it sells the "memory degraded" vibe without being
 * obnoxious — single character, sub-second, no animation library.
 */
function GlitchO() {
  const [glyph, setGlyph] = useState("0")
  useEffect(() => {
    const id = setInterval(() => {
      setGlyph((prev) => (prev === "0" ? "O" : prev === "O" ? "𝟘" : "0"))
    }, 1_400)
    return () => clearInterval(id)
  }, [])
  return <span className="text-emerald-500">{glyph}</span>
}
