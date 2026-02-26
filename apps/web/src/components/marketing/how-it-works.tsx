"use client"

import { motion } from "framer-motion"
import { ArrowRight, Check, Copy } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const mcpConfig = `{
  "dodev": {
    "type": "http",
    "url": "https://mcp.dodev.ai/mcp"
  }
}`

interface Step {
  number: string
  title: string
  description: string
  note?: string
  content: "signup" | "config" | "build"
}

const steps: Step[] = [
  {
    number: "01",
    title: "Sign Up",
    description:
      "Create your free account at dodev.ai. One click with Google or GitHub — no credit card, no setup wizard.",
    content: "signup",
  },
  {
    number: "02",
    title: "Connect Your Agent",
    description: "Add the MCP server config to Claude Code, Cursor, or any MCP-compatible client.",
    note: "Your agent will be prompted to authenticate on first use.",
    content: "config",
  },
  {
    number: "03",
    title: "Start Building",
    description:
      "Your AI now has persistent tasks, issues, and memories across every session. Context that carries forward, always.",
    content: "build",
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-300"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function SignUpVisual() {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button
        size="lg"
        className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-shadow hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/30"
        asChild
      >
        <Link href="/auth/sign-in">
          Get Started Free
          <ArrowRight className="ml-1 size-4" />
        </Link>
      </Button>
      <span className="text-xs text-muted-foreground">Google or GitHub — takes 5 seconds</span>
    </div>
  )
}

function ConfigBlock() {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="font-mono text-[11px] text-zinc-500">mcp.json</span>
        <CopyButton text={mcpConfig} />
      </div>
      <div className="relative">
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-300">
          <code>
            <span className="text-zinc-500">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="text-emerald-400">{'"dodev"'}</span>
            <span className="text-zinc-500">:</span> <span className="text-zinc-500">{"{"}</span>
            {"\n"}
            {"    "}
            <span className="text-emerald-400">{'"type"'}</span>
            <span className="text-zinc-500">:</span>{" "}
            <span className="text-amber-300">{'"http"'}</span>
            <span className="text-zinc-500">,</span>
            {"\n"}
            {"    "}
            <span className="text-emerald-400">{'"url"'}</span>
            <span className="text-zinc-500">:</span>{" "}
            <span className="text-amber-300">{'"https://mcp.dodev.ai/mcp"'}</span>
            {"\n"}
            {"  "}
            <span className="text-zinc-500">{"}"}</span>
            {"\n"}
            <span className="text-zinc-500">{"}"}</span>
          </code>
        </pre>
      </div>
    </div>
  )
}

function BuildVisual() {
  const lines = [
    { color: "text-zinc-500", text: "$ claude" },
    { color: "text-zinc-400", text: '> "What did we decide about the auth strategy?"' },
    { color: "text-emerald-400", text: "  Found 3 memories for project backend-api" },
    {
      color: "text-emerald-400",
      text: "  JWT with RS256, 24h expiry, refresh tokens via httpOnly cookies",
    },
    { color: "text-zinc-500", text: "" },
    {
      color: "text-zinc-400",
      text: '> "Create a task to add rate limiting to the auth endpoints"',
    },
    {
      color: "text-emerald-400",
      text: "  Task BACK-42 created: Add rate limiting to auth endpoints",
    },
  ]

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-code-bg">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
        <div className="size-2.5 rounded-full bg-red-500/70" />
        <div className="size-2.5 rounded-full bg-yellow-500/70" />
        <div className="size-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-[11px] text-zinc-500">Terminal</span>
      </div>
      <div className="p-4 font-mono text-[13px] leading-relaxed">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.12 }}
            className={cn(line.color, !line.text && "h-3")}
          >
            {line.text}
          </motion.p>
        ))}
      </div>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-emerald-200/60 bg-emerald-50/60 py-24 sm:py-32 dark:border-border dark:bg-muted/30"
    >
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Badge
            variant="outline"
            className="mb-4 border-emerald-300 bg-emerald-100/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            60 seconds to setup
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            60 seconds to an AI that{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              never forgets
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Three steps. No complex setup. Start with our cloud — self-hosted mode is coming soon.
          </p>
        </motion.div>

        {/* Steps with vertical line */}
        <div className="relative mt-16">
          {/* Vertical line connecting the balls */}
          <div className="absolute left-[19px] top-5 hidden h-[calc(100%-40px)] w-px bg-gradient-to-b from-emerald-400/40 via-emerald-500/20 to-transparent sm:block" />

          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.15 }}
                className="relative"
              >
                <div className="flex items-start gap-5 rounded-xl border border-border bg-card p-6">
                  <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20">
                    {step.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>

                    {step.content === "signup" && <SignUpVisual />}
                    {step.content === "config" && (
                      <>
                        <ConfigBlock />
                        {step.note && (
                          <p className="mt-3 text-xs text-muted-foreground/70">Note: {step.note}</p>
                        )}
                      </>
                    )}
                    {step.content === "build" && <BuildVisual />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
