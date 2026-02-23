"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Waitlist() {
  return (
    <section id="waitlist" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-12 text-center sm:p-16"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.06] blur-[80px] dark:from-emerald-500/10 dark:to-emerald-600/10" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                early access.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              DoMCP is launching soon. Create an account to join the waitlist and be the first to
              give your AI a memory.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                asChild
              >
                <Link href="/auth/sign-in">
                  Join the Waitlist
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://x.com/dodotdev" target="_blank" rel="noopener noreferrer">
                  <svg
                    className="mr-1 size-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow @dodotdev on X
                </a>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground/70">
              Creating an account reserves your spot. We'll email you when access is ready.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
