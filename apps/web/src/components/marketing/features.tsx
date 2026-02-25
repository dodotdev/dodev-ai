"use client"

import { motion } from "framer-motion"
import { Brain, CheckSquare, Code2, FolderOpen, RefreshCw, Server } from "lucide-react"

const features = [
  {
    title: "Tasks & Issues",
    description:
      "Create, update, and track tasks and issues with priorities, severity, due dates, labels, and sprint cycles — just like Linear.",
    icon: CheckSquare,
    borderColor: "border-l-emerald-500",
    iconColor: "text-emerald-500",
  },
  {
    title: "Persistent Memories",
    description:
      "Store architectural decisions, debugging insights, and project context your AI recalls automatically in future sessions.",
    icon: Brain,
    borderColor: "border-l-violet-500",
    iconColor: "text-violet-500",
  },
  {
    title: "Project Context",
    description:
      "Every session starts with full context — active tasks, recent memories, project config, and active cycle loaded automatically.",
    icon: FolderOpen,
    borderColor: "border-l-blue-500",
    iconColor: "text-blue-500",
  },
  {
    title: "Sprint Cycles",
    description:
      "Plan and track work in time-boxed cycles. Assign tasks to sprints and monitor progress across sessions.",
    icon: RefreshCw,
    borderColor: "border-l-amber-500",
    iconColor: "text-amber-500",
  },
  {
    title: "Self-Hosted First",
    description:
      "Run on your own infrastructure with Docker or npx. Your data stays on your machines. No account required.",
    icon: Server,
    borderColor: "border-l-cyan-500",
    iconColor: "text-cyan-500",
  },
  {
    title: "Open Protocol",
    description:
      "Built on the Model Context Protocol standard. Works with any MCP-compatible client, present and future.",
    icon: Code2,
    borderColor: "border-l-rose-500",
    iconColor: "text-rose-500",
  },
]

export function Features() {
  return (
    <section id="features" className="bg-zinc-950 py-24 text-zinc-50 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            31+ tools.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              Zero forgotten context.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Tasks, issues, memories, projects, cycles, and config — all through the Model Context
            Protocol.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`group rounded-xl border border-zinc-800 border-l-4 ${feature.borderColor} bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900`}
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`mb-4 flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/50 ${feature.iconColor}`}
                >
                  <Icon className="size-5" />
                </motion.div>
                <h3 className="text-lg font-semibold text-zinc-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
