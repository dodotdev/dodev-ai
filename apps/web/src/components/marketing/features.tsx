"use client"

import { motion } from "framer-motion"
import { Brain, CheckSquare, Code2, FolderOpen, RefreshCw, Server } from "lucide-react"

const features = [
  {
    title: "Todos",
    description: "Create, update, and track tasks with priorities, due dates, and tags.",
    icon: CheckSquare,
    large: true,
    gradient: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/5",
  },
  {
    title: "Memories",
    description: "Store context, decisions, and learnings your AI can recall later.",
    icon: Brain,
    large: true,
    gradient: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/5",
  },
  {
    title: "Projects",
    description: "Organize todos and memories by project with contextual awareness.",
    icon: FolderOpen,
    large: false,
    gradient: "from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/5",
  },
  {
    title: "Cross-Session",
    description: "Persistent state that survives restarts and context windows.",
    icon: RefreshCw,
    large: false,
    gradient: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/5",
  },
  {
    title: "Self-Hosted",
    description: "Run on your own infrastructure. Your data stays yours.",
    icon: Server,
    large: false,
    gradient: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/5",
  },
  {
    title: "Open Source",
    description: "MIT licensed. Fully transparent. Community driven.",
    icon: Code2,
    large: false,
    gradient: "from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/5",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your AI needs to
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              {" "}
              stay organized
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            18 MCP tools across 4 categories. Built for persistent AI workflows.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-border hover:shadow-md dark:hover:bg-surface-hover ${
                  feature.large ? "sm:col-span-2" : ""
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                />

                <div className="relative">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
