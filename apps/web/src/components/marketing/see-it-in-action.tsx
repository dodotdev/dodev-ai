"use client"

import { motion } from "framer-motion"
import {
  Brain,
  CheckCircle2,
  CircleAlert,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

/* -------------------------------------------------------------------------- */
/*  Data: two sessions of a simulated Claude Code conversation                */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  role: "user" | "ai"
  text: string
  /** Small badges rendered beneath the AI response */
  badges?: { label: string; icon?: "check" | "brain" | "alert" | "loader" | "sparkles"; color: string }[]
}

interface Session {
  label: string
  timestamp: string
  messages: ChatMessage[]
}

const sessions: Session[] = [
  {
    label: "Session 1",
    timestamp: "Monday 2:30 PM",
    messages: [
      {
        role: "user",
        text: "Create a task to implement Stripe webhook handling with high priority",
      },
      {
        role: "ai",
        text: 'Created task PAYMENTS-7: Implement Stripe webhook handling [High Priority]',
        badges: [
          { label: "Task created", icon: "check", color: "emerald" },
        ],
      },
      {
        role: "user",
        text: "Remember that we decided to use idempotency keys for webhook deduplication",
      },
      {
        role: "ai",
        text: "Saved as a decision memory in payments-api.",
        badges: [
          { label: "Memory saved", icon: "brain", color: "violet" },
        ],
      },
    ],
  },
  {
    label: "Session 2",
    timestamp: "Wednesday 10:15 AM",
    messages: [
      {
        role: "user",
        text: "What's on my plate for the payments project?",
      },
      {
        role: "ai",
        text: "Loading context... You have 3 pending tasks including PAYMENTS-7 (Stripe webhooks). I also found a relevant memory: you decided to use idempotency keys for webhook deduplication.",
        badges: [
          { label: "Context loaded", icon: "loader", color: "blue" },
          { label: "1 memory recalled", icon: "brain", color: "violet" },
        ],
      },
      {
        role: "user",
        text: "Found a bug \u2014 webhook events are being processed twice",
      },
      {
        role: "ai",
        text: "Created issue PAYMENTS-12: Duplicate webhook event processing [Critical]. Based on your earlier decision to use idempotency keys, this might be a race condition in the queue consumer.",
        badges: [
          { label: "Issue created", icon: "alert", color: "amber" },
          { label: "Memory applied", icon: "sparkles", color: "violet" },
        ],
      },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*  Badge icon helper                                                         */
/* -------------------------------------------------------------------------- */

function BadgeIcon({ icon }: { icon?: string }) {
  const cls = "mr-1 size-3"
  switch (icon) {
    case "check":
      return <CheckCircle2 className={cls} />
    case "brain":
      return <Brain className={cls} />
    case "alert":
      return <CircleAlert className={cls} />
    case "loader":
      return <Loader2 className={cls} />
    case "sparkles":
      return <Sparkles className={cls} />
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/*  Color map for badge variants                                              */
/* -------------------------------------------------------------------------- */

const badgeColors: Record<string, string> = {
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function SeeItInAction() {
  /** Running delay counter so every element staggers naturally */
  let globalDelay = 0

  return (
    <section className="border-y border-border bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* ---- Heading ---- */}
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
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Tasks, issues, and memories working together across sessions
            &mdash; your AI never starts from scratch.
          </p>
        </motion.div>

        {/* ---- Chat window ---- */}
        <div className="mx-auto mt-16 max-w-2xl">
          {sessions.map((session, sessionIdx) => {
            /* Reset delay slightly for each session start */
            if (sessionIdx > 0) globalDelay += 0.15

            const sessionBlock = (
              <div key={session.label}>
                {/* Session divider (between sessions) */}
                {sessionIdx > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: (globalDelay += 0.1) }}
                    className="relative my-10 flex items-center justify-center"
                  >
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
                    <span className="relative z-10 bg-muted/30 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      New Session
                    </span>
                  </motion.div>
                )}

                {/* Session timestamp */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: (globalDelay += 0.08) }}
                  className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Clock className="size-3.5" />
                  {session.label} &mdash; {session.timestamp}
                </motion.div>

                {/* Messages */}
                {session.messages.map((msg, msgIdx) => {
                  const delay = (globalDelay += 0.12)

                  if (msg.role === "user") {
                    return (
                      <motion.div
                        key={`${session.label}-msg-${msgIdx}`}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay }}
                        className="mb-3 ml-auto max-w-md rounded-2xl rounded-br-md bg-emerald-600 px-5 py-3.5 text-sm leading-relaxed text-white shadow-sm"
                      >
                        {msg.text}
                      </motion.div>
                    )
                  }

                  /* AI message */
                  return (
                    <div key={`${session.label}-msg-${msgIdx}`} className="mb-4">
                      <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay }}
                        className="mr-auto max-w-md rounded-2xl rounded-bl-md border border-border bg-card px-5 py-3.5 text-sm leading-relaxed text-foreground shadow-sm"
                      >
                        {msg.text}
                      </motion.div>

                      {/* Badges */}
                      {msg.badges && msg.badges.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.3,
                            delay: delay + 0.15,
                          }}
                          className="ml-1 mt-2 flex flex-wrap gap-2"
                        >
                          {msg.badges.map((b) => (
                            <Badge
                              key={b.label}
                              variant="outline"
                              className={badgeColors[b.color] ?? badgeColors.emerald}
                            >
                              <BadgeIcon icon={b.icon} />
                              {b.label}
                            </Badge>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            )

            return sessionBlock
          })}
        </div>
      </div>
    </section>
  )
}
