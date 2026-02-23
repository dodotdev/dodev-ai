"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const terminalLines = [
  { type: "prompt", text: "Session 1", delay: 0 },
  {
    type: "input",
    text: '> "Remember: auth uses JWT with RS256 and 24h token expiry"',
    delay: 0.3,
  },
  { type: "output", text: "", delay: 0.8 },
  { type: "success", text: '  Memory saved to project "backend-api"', delay: 1.0 },
  { type: "spacer", text: "", delay: 1.3 },
  { type: "prompt", text: "Session 2 (new context window)", delay: 1.6 },
  { type: "input", text: '> "What auth approach are we using?"', delay: 1.9 },
  { type: "output", text: "", delay: 2.4 },
  {
    type: "recall",
    text: "  Found memory: JWT with RS256, 24h token expiry",
    delay: 2.6,
  },
  {
    type: "output",
    text: '  Applied to project "backend-api" — 2 related memories loaded',
    delay: 2.9,
  },
]

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-16">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-[120px] animate-pulse dark:bg-emerald-500/10" />
        <div className="absolute -bottom-1/2 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/[0.07] blur-[120px] animate-pulse [animation-delay:2s] dark:bg-emerald-500/10" />
        <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.04] blur-[100px] animate-pulse [animation-delay:4s] dark:bg-cyan-500/5" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Open Source &middot; MIT Licensed
            </div>

            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Your AI has
              <br />
              amnesia.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                Let&apos;s fix that.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Persistent task and memory management for Claude Code, Cursor, Windsurf, and any
              MCP-compatible agent. Your AI remembers across every session.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-shadow hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/30"
                asChild
              >
                <Link href="/auth/sign-in">
                  Join the Waitlist
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/dodotdev/domcp-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-1 size-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground/70">
              Free forever for self-hosted. No credit card required.
            </p>
          </motion.div>

          {/* Animated Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-xl border border-border bg-code-bg shadow-2xl shadow-black/10 dark:shadow-emerald-500/5">
              {/* Terminal chrome */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <div className="size-3 rounded-full bg-red-500/70" />
                <div className="size-3 rounded-full bg-yellow-500/70" />
                <div className="size-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-zinc-500">Terminal — DoMCP</span>
              </div>

              {/* Terminal content */}
              <div className="relative min-h-[320px] p-6 font-mono text-sm leading-relaxed">
                {terminalLines.map((line) => (
                  <motion.div
                    key={`${line.type}-${line.delay}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: line.delay }}
                  >
                    {line.type === "spacer" ? (
                      <div className="h-4" />
                    ) : line.type === "prompt" ? (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-500/70">
                        {line.text}
                      </p>
                    ) : line.type === "input" ? (
                      <p className="text-zinc-300">{line.text}</p>
                    ) : line.type === "success" ? (
                      <p className="text-emerald-400">{line.text}</p>
                    ) : line.type === "recall" ? (
                      <p className="text-emerald-400">{line.text}</p>
                    ) : line.text ? (
                      <p className="text-zinc-500">{line.text}</p>
                    ) : null}
                  </motion.div>
                ))}

                {/* Blinking cursor */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.2 }}
                  className="mt-2 inline-block h-4 w-2 bg-emerald-400"
                  style={{ animation: "blink 1s step-end infinite" }}
                />

                {/* Gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5" />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 3.5 }}
              className="absolute -bottom-4 -right-4 rounded-lg border border-border bg-background px-4 py-2 shadow-xl"
            >
              <p className="text-xs text-muted-foreground">Your AI now remembers. Always.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
