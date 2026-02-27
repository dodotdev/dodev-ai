"use client"

import { motion } from "framer-motion"
import { Check, Clock, Sparkles } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Plan data                                                                 */
/* -------------------------------------------------------------------------- */

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted: boolean
}

const plans: Plan[] = [
  {
    name: "Hobby",
    price: "$0",
    period: "/month",
    description: "Get started with generous free limits",
    features: [
      "1 project",
      "1 agent connection",
      "100 tasks & issues",
      "30 memories",
      "31 MCP tools",
      "Web dashboard",
      "Cloud MCP server",
      "Community support",
    ],
    cta: "Join Waitlist",
    href: "/auth/sign-in",
    highlighted: false,
  },
  {
    name: "Personal",
    price: "$10",
    period: "/month",
    description: "More projects and capacity for solo builders",
    features: [
      "3 projects",
      "Up to 3 agents",
      "500 tasks & issues",
      "200 memories",
      "31 MCP tools",
      "Web dashboard",
      "Cloud MCP server",
      "Priority support",
    ],
    cta: "Join Waitlist",
    href: "/auth/sign-in",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    description: "Unlimited everything for serious builders",
    features: [
      "Unlimited projects",
      "Up to 10 agents",
      "Unlimited tasks & issues",
      "Unlimited memories",
      "Semantic memory search",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Join Waitlist",
    href: "/auth/sign-in",
    highlighted: true,
  },
]

const selfHosted = {
  name: "Self-Hosted",
  price: "Free",
  period: "forever",
  description: "Your infrastructure, your data. Run on your own servers with Docker or npx.",
  features: [
    "Unlimited everything",
    "Docker & npx install",
    "No account required",
    "Full data ownership",
    "Community support",
  ],
  cta: "Join Waitlist",
  href: "/auth/sign-in",
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
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
            Simple,{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              transparent
            </span>{" "}
            pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Free to start, upgrade when you need more. Self-host coming soon.
          </p>
        </motion.div>

        {/* ---- 3-column cards ---- */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border p-6 transition-shadow hover:shadow-lg",
                plan.highlighted
                  ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.07] to-transparent shadow-lg shadow-emerald-500/10 dark:from-emerald-500/[0.09]"
                  : "border-border bg-card"
              )}
            >
              {/* Popular ribbon */}
              {plan.highlighted && (
                <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-emerald-400 to-emerald-600 px-12 py-1 text-xs font-medium text-white shadow-sm">
                  Popular
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Feature list */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <Check className="size-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={cn(
                  "w-full",
                  plan.highlighted
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                    : "bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                )}
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* ---- Self-Hosted full-width ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6"
        >
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
              {/* Left: info */}
              <div className="flex-1">
                <div className="mb-3">
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    <Clock className="mr-1 size-3" />
                    Coming Soon
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold">{selfHosted.name}</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{selfHosted.price}</span>
                  <span className="text-sm text-muted-foreground">{selfHosted.period}</span>
                </div>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {selfHosted.description}
                </p>
              </div>

              {/* Middle: features */}
              <ul className="flex flex-1 flex-wrap gap-x-8 gap-y-2">
                {selfHosted.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="size-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Right: CTA */}
              <div className="shrink-0">
                <Button
                  variant="outline"
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  asChild
                >
                  <Link href={selfHosted.href}>
                    <Sparkles className="mr-1 size-4" />
                    {selfHosted.cta}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
