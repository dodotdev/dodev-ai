"use client"

import { motion } from "framer-motion"

const clients = [
  { name: "Claude Code", icon: "C" },
  { name: "Cursor", icon: "Cu" },
  { name: "Windsurf", icon: "W" },
  { name: "VS Code", icon: "VS" },
  { name: "Any MCP Client", icon: "+" },
]

export function SocialProof() {
  return (
    <section className="border-y border-emerald-200/60 bg-emerald-50/60 py-12 dark:border-border dark:bg-muted/30">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-8"
        >
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground/70">
            Works with any MCP-compatible AI agent
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {clients.map((client, i) => (
              <motion.div
                key={client.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50 font-mono text-xs font-bold">
                  {client.icon}
                </div>
                <span className="text-sm font-medium">{client.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
