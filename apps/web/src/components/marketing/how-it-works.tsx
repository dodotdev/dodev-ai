"use client"

import { motion } from "framer-motion"

const steps = [
  {
    number: "01",
    title: "Install",
    description: "One command. No account required.",
    code: "npx @dodev/mcp-server@latest",
  },
  {
    number: "02",
    title: "Configure",
    description: "Add to your AI agent's MCP config.",
    code: `{
  "dodev": {
    "command": "npx",
    "args": ["@dodev/mcp-server"]
  }
}`,
  },
  {
    number: "03",
    title: "Done",
    description: "Your AI now has persistent memory.",
    code: `✓ Memory saved to "backend-api"
✓ 3 related memories found`,
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-emerald-200/60 bg-emerald-50/60 py-24 sm:py-32 dark:border-border dark:bg-muted/30"
    >
      <div className="mx-auto max-w-2xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            60 seconds to an AI that{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              never forgets
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Three steps. No complex setup. No account required for self-hosted.
          </p>
        </motion.div>

        <div className="mt-16 space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
            >
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
                    {step.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-code-bg">
                      <pre className="p-3 font-mono text-xs leading-relaxed text-zinc-400">
                        <code>{step.code}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
