"use client"

import { motion } from "framer-motion"
import { Brain, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SeeItInAction() {
  return (
    <section className="bg-zinc-950 py-24 text-zinc-50 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See it{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              in action
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Watch how DoMCP gives your AI persistent memory across sessions.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 max-w-2xl">
          {/* Session 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="size-3.5" />
              Session 1 — Monday 2:30 PM
            </div>

            {/* User message */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-3 ml-auto max-w-md rounded-2xl rounded-br-md bg-emerald-600 px-5 py-3.5 text-sm text-white"
            >
              Remember that we decided to handle Stripe webhooks with idempotency keys and store
              events in a processing queue before confirming.
            </motion.div>

            {/* AI response */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-3 mr-auto max-w-md rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-sm text-zinc-300"
            >
              Got it. I&apos;ve saved this as a memory in your &quot;payments-api&quot; project.
              I&apos;ll reference this approach for all future Stripe webhook work.
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="mb-8 ml-1"
            >
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              >
                Memory saved
              </Badge>
            </motion.div>
          </motion.div>

          {/* New Session Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative my-8 flex items-center justify-center"
          >
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-zinc-700" />
            <span className="relative z-10 bg-zinc-950 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
              New Session
            </span>
          </motion.div>

          {/* Session 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="size-3.5" />
              Session 2 — Wednesday 10:15 AM
            </div>

            {/* User message */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-3 ml-auto max-w-md rounded-2xl rounded-br-md bg-emerald-600 px-5 py-3.5 text-sm text-white"
            >
              I need to implement the payment retry logic. How should we handle failed webhook
              deliveries?
            </motion.div>

            {/* AI response with memory recall */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-3 mr-auto max-w-md rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-sm text-zinc-300"
            >
              Based on the approach you established — using idempotency keys with a processing queue
              — I&apos;d recommend implementing exponential backoff retries that check the queue
              before reprocessing. This keeps your idempotency guarantees intact.
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="ml-1"
            >
              <Badge
                variant="outline"
                className="border-violet-500/30 bg-violet-500/10 text-violet-400"
              >
                <Brain className="mr-1 size-3" />
                Recalled from memory
              </Badge>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
