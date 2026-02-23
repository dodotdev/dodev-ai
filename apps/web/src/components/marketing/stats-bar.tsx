"use client"

import { motion, useInView } from "framer-motion"
import { Download, Github, Terminal, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1500
    const steps = 40
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [isInView, target])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

const stats = [
  { label: "GitHub Stars", value: 2400, suffix: "+", icon: Github },
  { label: "Weekly Downloads", value: 12000, suffix: "+", icon: Download },
  { label: "MCP Tools", value: 31, suffix: "", icon: Terminal },
  { label: "Developers", value: 500, suffix: "+", icon: Users },
]

export function StatsBar() {
  return (
    <section className="border-y border-emerald-200/60 bg-emerald-50/60 py-16 dark:border-border dark:bg-muted/30">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <Icon className="mb-2 size-5 text-emerald-500" />
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
