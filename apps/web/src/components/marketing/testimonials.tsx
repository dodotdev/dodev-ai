"use client"

import { motion } from "framer-motion"

const testimonials = [
  {
    quote:
      "DoMCP changed how I work with Claude Code. It remembers our architectural decisions across sessions — I never have to re-explain the same patterns twice.",
    name: "Sarah Chen",
    role: "Senior Backend Engineer",
    initials: "SC",
    color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    quote:
      "I used to spend the first 10 minutes of every AI session catching it up. Now it just knows. The time savings compound every single day.",
    name: "Marcus Rodriguez",
    role: "Full-stack Developer",
    initials: "MR",
    color: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
  },
  {
    quote:
      "Self-hosted, MIT licensed, and it took me 60 seconds to set up. DoMCP is exactly what the AI coding tools ecosystem was missing.",
    name: "Alex Kim",
    role: "DevOps Engineer",
    initials: "AK",
    color: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  },
]

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Developers love{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              DoMCP
            </span>
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative rounded-xl border border-border bg-card p-6"
            >
              <span className="absolute -top-3 left-6 text-5xl font-bold leading-none text-muted-foreground/10">
                &ldquo;
              </span>
              <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">
                {t.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-full text-xs font-bold ${t.color}`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
