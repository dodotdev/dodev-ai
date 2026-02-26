"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Github, Terminal } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface TerminalLine {
  id: number
  type: "command" | "success" | "info" | "spacer"
  text: string
  delay: number
}

const terminalSequence: TerminalLine[] = [
  {
    id: 0,
    type: "command",
    text: "> get_context",
    delay: 400,
  },
  {
    id: 1,
    type: "success",
    text: 'Loaded project "payments-api"',
    delay: 800,
  },
  {
    id: 2,
    type: "info",
    text: "  3 pending tasks \u00b7 2 open issues \u00b7 12 memories",
    delay: 400,
  },
  {
    id: 3,
    type: "spacer",
    text: "",
    delay: 600,
  },
  {
    id: 4,
    type: "command",
    text: '> create_task title="Implement webhook retry logic" priority="high"',
    delay: 500,
  },
  {
    id: 5,
    type: "success",
    text: "Created PAYMENTS-14",
    delay: 900,
  },
  {
    id: 6,
    type: "spacer",
    text: "",
    delay: 500,
  },
  {
    id: 7,
    type: "command",
    text: '> add_memory content="Decided on exponential backoff with jitter for retries, max 5 attempts" type="decision"',
    delay: 500,
  },
  {
    id: 8,
    type: "success",
    text: 'Memory saved to "payments-api"',
    delay: 800,
  },
  {
    id: 9,
    type: "spacer",
    text: "",
    delay: 500,
  },
  {
    id: 10,
    type: "command",
    text: "> search_memories query=\"retry\"",
    delay: 500,
  },
  {
    id: 11,
    type: "success",
    text: "Found 1 memory",
    delay: 700,
  },
  {
    id: 12,
    type: "info",
    text: '  [decision] "Exponential backoff with jitter, max 5 attempts"',
    delay: 400,
  },
]

function TerminalAnimation() {
  const [visibleLines, setVisibleLines] = useState<number[]>([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    let timeoutIds: ReturnType<typeof setTimeout>[] = []
    let cumulativeDelay = 800

    for (let i = 0; i < terminalSequence.length; i++) {
      const line = terminalSequence[i]
      const showDelay = cumulativeDelay
      cumulativeDelay += line.delay

      if (line.type === "command") {
        // Show typing indicator briefly before command appears
        const typingTimeout = setTimeout(() => {
          setIsTyping(true)
        }, showDelay - 300)
        timeoutIds.push(typingTimeout)
      }

      const lineTimeout = setTimeout(() => {
        setIsTyping(false)
        setVisibleLines((prev) => [...prev, line.id])
      }, showDelay)
      timeoutIds.push(lineTimeout)
    }

    return () => {
      for (const id of timeoutIds) clearTimeout(id)
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl shadow-black/20 dark:shadow-emerald-500/5">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="size-3 rounded-full bg-[#ff5f57]" />
        <div className="size-3 rounded-full bg-[#febc2e]" />
        <div className="size-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex items-center gap-1.5 text-xs text-zinc-500">
          <Terminal className="size-3" />
          <span>claude-code</span>
        </div>
      </div>

      {/* Terminal content */}
      <div className="min-h-[360px] p-5 font-mono text-[13px] leading-relaxed">
        <AnimatePresence mode="popLayout">
          {terminalSequence
            .filter((line) => visibleLines.includes(line.id))
            .map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {line.type === "spacer" ? (
                  <div className="h-3" />
                ) : line.type === "command" ? (
                  <p className="text-zinc-200">
                    <span className="text-emerald-400">{">"}</span>{" "}
                    <span className="text-zinc-100">
                      {line.text.slice(2)}
                    </span>
                  </p>
                ) : line.type === "success" ? (
                  <p className="text-emerald-400">
                    <span className="mr-1.5">{"  \u2713"}</span>
                    {line.text}
                  </p>
                ) : (
                  <p className="text-zinc-500">{line.text}</p>
                )}
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 pt-0.5"
          >
            <span className="text-emerald-400">{">"}</span>
            <span
              className="inline-block h-4 w-[7px] bg-emerald-400/80"
              style={{ animation: "blink 1s step-end infinite" }}
            />
          </motion.div>
        )}

        {/* Idle cursor */}
        {!isTyping && visibleLines.length === terminalSequence.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1 pt-1"
          >
            <span className="text-emerald-400">{">"}</span>
            <span
              className="inline-block h-4 w-[7px] bg-emerald-400/80"
              style={{ animation: "blink 1s step-end infinite" }}
            />
          </motion.div>
        )}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 via-transparent to-transparent" />
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-20 pb-12">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.07, 0.12, 0.07],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-1/3 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500 blur-[100px]"
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column: copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Badge
                variant="outline"
                className="mb-6 gap-2 border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-sm text-emerald-400"
              >
                <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Open Source &middot; MIT Licensed
              </Badge>
            </motion.div>

            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Project management
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                for AI agents.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Tasks, issues, and persistent memory for Claude Code, Cursor,
              Windsurf, and any MCP-compatible client. Your agents remember
              decisions, track work, and start every session with full context.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30"
                asChild
              >
                <Link href="/auth/sign-in">
                  Get Started
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/dodotdev/dodev-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-1 size-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>

            <p className="mt-5 text-sm text-muted-foreground/60">
              Free cloud tier available. Self-hosted coming soon.
            </p>
          </motion.div>

          {/* Right column: terminal */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <TerminalAnimation />

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 8.5 }}
              className="absolute -bottom-4 right-0 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 shadow-xl sm:-right-3"
            >
              <p className="text-xs font-medium text-zinc-300">
                31 tools &middot; 7 categories &middot;{" "}
                <span className="text-emerald-400">works today</span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
