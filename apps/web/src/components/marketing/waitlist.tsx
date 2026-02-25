"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"
import Link from "next/link"
import { useId } from "react"
import { Button } from "@/components/ui/button"

export function Waitlist() {
  const grainId = useId()
  return (
    <section
      id="waitlist"
      className="relative overflow-hidden bg-zinc-950 py-24 text-zinc-50 sm:py-32"
    >
      {/* Grain overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <svg className="h-full w-full" aria-hidden="true">
          <filter id={grainId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${grainId})`} />
        </svg>
      </div>

      {/* Emerald gradient blob */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Stop re-explaining yourself
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              to your AI.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            Give your AI persistent memory. Join the developers who are building with continuity,
            not repetition.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/30"
              asChild
            >
              <Link href="/auth/sign-in">
                Join the Waitlist
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white"
              asChild
            >
              <a
                href="https://github.com/dodotdev/dodev-ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-1 size-4" />
                Star on GitHub
              </a>
            </Button>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            Free forever for self-hosted. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
