"use client"

import { motion } from "framer-motion"

const steps = [
  {
    number: "01",
    title: "Install",
    description: "One command to get the MCP server running. Via npx, Docker, or global install.",
    code: `npx @domcp/mcp-server@latest`,
  },
  {
    number: "02",
    title: "Configure",
    description: "Add DoMCP to your AI agent's MCP configuration. Works with any MCP client.",
    code: `{
  "mcpServers": {
    "domcp": {
      "command": "npx",
      "args": ["@domcp/mcp-server"]
    }
  }
}`,
  },
  {
    number: "03",
    title: "Use",
    description:
      "Your AI agent now has persistent todos, memories, and project context across sessions.",
    code: `> "Remember that the auth system uses JWT
    tokens with 24h expiry"

✓ Memory saved to project "backend-api"
✓ 3 related memories found`,
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-emerald-200/60 bg-emerald-50/60 py-24 sm:py-32 dark:border-border dark:bg-muted/30"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              under a minute
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Three steps. No complex setup. No account required for self-hosted.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden h-px w-8 translate-x-full bg-gradient-to-r from-border to-transparent lg:block" />
              )}

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>

                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>

                {/* Code block — always dark */}
                <div className="overflow-hidden rounded-lg border border-border bg-code-bg">
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-400">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
