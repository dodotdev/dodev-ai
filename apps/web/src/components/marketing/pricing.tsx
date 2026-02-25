"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Self-hosted. Your infrastructure, your data.",
    features: [
      "1 project",
      "100 tasks & 200 issues",
      "50 memories",
      "31 MCP tools",
      "Docker & npx install",
      "Community support",
    ],
    cta: "Contact Us",
    href: "mailto:team@do.dev",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$10",
    period: "/month",
    description: "Cloud hosted. Unlimited everything.",
    features: [
      "Unlimited projects",
      "Unlimited tasks & issues",
      "Unlimited memories",
      "Vector search (semantic)",
      "Cloud hosted MCP server",
      "Priority support",
    ],
    cta: "Contact Us",
    href: "mailto:team@do.dev",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$20",
    period: "/user/month",
    description: "Collaboration features for teams.",
    features: [
      "Everything in Pro",
      "Team sharing",
      "Audit log",
      "SSO (SAML)",
      "Custom retention",
      "Dedicated support",
    ],
    cta: "Contact Us",
    href: "mailto:team@do.dev",
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
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
            Free forever for self-hosted. Pay only for cloud convenience.
          </p>
        </motion.div>

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
                "relative overflow-hidden rounded-xl border p-6 transition-shadow hover:shadow-lg",
                plan.highlighted
                  ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.06] to-transparent dark:from-emerald-500/[0.08]"
                  : "border-border bg-card"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-emerald-400 to-emerald-600 px-12 py-1 text-xs font-medium text-white shadow-sm">
                  Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="mb-8 space-y-3">
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

              <Button
                className={cn(
                  "w-full",
                  plan.highlighted
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                    : ""
                )}
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
