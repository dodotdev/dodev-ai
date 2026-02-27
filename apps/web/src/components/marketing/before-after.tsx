"use client"

import { motion } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"

const painPoints = [
  "Forgets decisions made last session",
  "Repeats the same mistakes",
  "No continuity between conversations",
  "Loses project context on restart",
  "Starts from zero every single time",
]

const benefits = [
  "Remembers every architectural decision",
  "Learns from past context and patterns",
  "Picks up exactly where you left off",
  "Persistent memory across restarts",
  "Builds knowledge over time",
]

export function BeforeAfter() {
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
            See the{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              difference
            </span>
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-border bg-card p-8 border-l-4 border-l-red-500/70"
          >
            <h3 className="text-lg font-semibold text-red-500 dark:text-red-400">
              Without dodev.ai
            </h3>
            <ul className="mt-6 space-y-4">
              {painPoints.map((point, i) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <XCircle className="mt-0.5 size-4 shrink-0 text-red-500/70" />
                  {point}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-border bg-card p-8 border-l-4 border-l-emerald-500/70"
          >
            <h3 className="text-lg font-semibold text-emerald-500 dark:text-emerald-400">
              With dodev.ai
            </h3>
            <ul className="mt-6 space-y-4">
              {benefits.map((benefit, i) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500/70" />
                  {benefit}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
