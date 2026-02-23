"use client"

import { motion } from "framer-motion"

const clients = [
  {
    name: "Claude Code",
    gradient: "from-orange-500/20 to-orange-600/10 dark:from-orange-500/30 dark:to-orange-600/15",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20",
  },
  {
    name: "Cursor",
    gradient: "from-blue-500/20 to-blue-600/10 dark:from-blue-500/30 dark:to-blue-600/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  {
    name: "Windsurf",
    gradient: "from-teal-500/20 to-teal-600/10 dark:from-teal-500/30 dark:to-teal-600/15",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20",
  },
  {
    name: "VS Code",
    gradient: "from-sky-500/20 to-sky-600/10 dark:from-sky-500/30 dark:to-sky-600/15",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
  },
  {
    name: "Any MCP Client",
    gradient: "from-zinc-500/20 to-zinc-600/10 dark:from-zinc-500/30 dark:to-zinc-600/15",
    text: "text-zinc-600 dark:text-zinc-400",
    border: "border-zinc-500/20",
  },
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

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {clients.map((client, i) => (
              <motion.div
                key={client.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ scale: 1.05 }}
                className={`rounded-full border bg-gradient-to-r px-5 py-2 text-sm font-medium transition-shadow hover:shadow-md ${client.gradient} ${client.text} ${client.border}`}
              >
                {client.name}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
