"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const configSnippet = `{
  "mcpServers": {
    "domcp": {
      "command": "npx",
      "args": ["@domcp/mcp-server"],
      "env": {
        "DOMCP_API_KEY": "domcp_sk_..."
      }
    }
  }
}`

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
              Give your AI
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                a memory.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Open-source task and memory management for Claude Code, Cursor, Windsurf, and any
              MCP-compatible AI agent. Persistent, cross-session awareness.
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
                  View on GitHub
                </a>
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground/70">
              Sign up to reserve your spot. Free forever for self-hosted.
            </p>
          </motion.div>

          {/* Code snippet — stays dark in both themes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-xl border border-border bg-code-bg shadow-2xl shadow-black/10 dark:shadow-emerald-500/5">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <div className="size-3 rounded-full bg-white/10" />
                <div className="size-3 rounded-full bg-white/10" />
                <div className="size-3 rounded-full bg-white/10" />
                <span className="ml-3 text-xs text-zinc-500">claude_code_config.json</span>
              </div>

              <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
                <code className="text-zinc-400">{configSnippet}</code>
              </pre>

              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/5" />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -bottom-4 -right-4 rounded-lg border border-border bg-background px-4 py-2 shadow-xl"
            >
              <p className="text-xs text-muted-foreground">
                That&apos;s it. Your AI now remembers.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
