"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, BookOpen, Server, Sparkles, Users } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface RoadmapItem {
  title: string
  description: string
  icon: LucideIcon
  accentColor: string
  iconBg: string
}

const roadmapItems: RoadmapItem[] = [
  {
    title: "Self-Hosted Mode",
    description:
      "Run on your own infrastructure with Docker. Your data, your servers. No account required.",
    icon: Server,
    accentColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    title: "Documentation",
    description:
      "Comprehensive docs site with guides, API reference, and integration tutorials for every MCP client.",
    icon: BookOpen,
    accentColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Semantic Memory Search",
    description:
      "Vector embeddings for intelligent memory recall. Your AI finds relevant context even with different wording.",
    icon: Sparkles,
    accentColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    title: "Team Collaboration",
    description:
      "Share projects, memories, and context across your entire team of AI agents. Collective intelligence.",
    icon: Users,
    accentColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
  },
]

export function ComingSoon() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Animated background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/[0.03] blur-[120px]"
        />
        <motion.div
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-1/4 right-1/4 h-[400px] w-[500px] rounded-full bg-violet-500/[0.02] blur-[100px]"
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Badge variant="outline" className="mb-4 border-border bg-muted/50 text-muted-foreground">
            Roadmap
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What{"'"}s{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              coming next
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            We{"'"}re building in public. Here{"'"}s what{"'"}s on our radar — and we ship fast.
          </p>
        </motion.div>

        {/* 2x2 Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {roadmapItems.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ y: -3 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-colors hover:border-border hover:bg-muted/50"
              >
                {/* Subtle card glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative">
                  {/* Top row: icon + badge */}
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`flex size-11 items-center justify-center rounded-lg border ${item.iconBg} ${item.accentColor}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className="border-border bg-muted/70 text-[11px] text-muted-foreground"
                    >
                      Coming Soon
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8">
            <p className="text-sm font-medium text-foreground">Want to shape what we build next?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Star us on GitHub, open an issue, or join the conversation.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="default"
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-shadow hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/30"
                asChild
              >
                <a
                  href="https://github.com/dodotdev/dodev-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Star on GitHub
                  <ArrowRight className="ml-1 size-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="default"
                className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
                asChild
              >
                <Link href="/auth/sign-in">Join the Waitlist</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
