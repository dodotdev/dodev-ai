"use client"

import { motion } from "framer-motion"
import { Github, Heart, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function OpenSource() {
  return (
    <section className="py-24 sm:py-32">
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
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full border border-border bg-muted/50">
              <Heart className="size-6 text-rose-400" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built in public.{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                Open source.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              DoMCP is MIT licensed and open to contributions. Star us on GitHub, report issues, or
              submit a PR.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                asChild
              >
                <a
                  href="https://github.com/dodotdev/domcp-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Star className="mr-1 size-4" />
                  Star on GitHub
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/dodotdev/domcp-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-1 size-4" />
                  View Source
                </a>
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
                  Follow on X
                </a>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <span>MIT License</span>
              <span>&middot;</span>
              <span>TypeScript</span>
              <span>&middot;</span>
              <span>MCP Protocol</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
