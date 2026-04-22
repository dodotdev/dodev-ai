"use client"

import { motion } from "framer-motion"
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  Lightbulb,
  Loader2,
  Settings2,
  Tag,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Shared animation variants                                                 */
/* -------------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

/* -------------------------------------------------------------------------- */
/*  Feature 1 - Tasks & Issues mock data                                      */
/* -------------------------------------------------------------------------- */

interface TaskItem {
  id: string
  title: string
  status: "done" | "in_progress" | "todo"
  priority: "urgent" | "high" | "medium" | "low"
  labels: string[]
  assignee?: string
}

const mockTasks: TaskItem[] = [
  {
    id: "PAYMENTS-11",
    title: "Add idempotency keys to charge endpoint",
    status: "done",
    priority: "high",
    labels: ["api"],
    assignee: "CL",
  },
  {
    id: "PAYMENTS-12",
    title: "Implement webhook signature verification",
    status: "in_progress",
    priority: "urgent",
    labels: ["security"],
    assignee: "AI",
  },
  {
    id: "PAYMENTS-13",
    title: "Add Stripe test mode toggle to settings",
    status: "todo",
    priority: "medium",
    labels: ["dashboard"],
  },
  {
    id: "PAYMENTS-14",
    title: "Implement webhook retry logic",
    status: "todo",
    priority: "high",
    labels: ["api", "reliability"],
  },
  {
    id: "PAYMENTS-15",
    title: "Write integration tests for refund flow",
    status: "todo",
    priority: "low",
    labels: ["testing"],
  },
]

const priorityConfig: Record<TaskItem["priority"], { color: string; label: string }> = {
  urgent: { color: "bg-red-500", label: "Urgent" },
  high: { color: "bg-orange-500", label: "High" },
  medium: { color: "bg-yellow-500", label: "Medium" },
  low: { color: "bg-blue-500", label: "Low" },
}

const statusConfig: Record<TaskItem["status"], { icon: typeof CheckCircle2; color: string }> = {
  done: { icon: CheckCircle2, color: "text-emerald-400" },
  in_progress: { icon: Loader2, color: "text-amber-400" },
  todo: { icon: Circle, color: "text-zinc-600" },
}

function TaskListVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0c]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-200">payments-api</span>
          <span className="text-xs text-zinc-600">Sprint 3</span>
        </div>
        <span className="text-xs text-zinc-600">5 tasks</span>
      </div>

      {/* Task rows */}
      <div className="divide-y divide-zinc-800/60">
        {mockTasks.map((task, i) => {
          const StatusIcon = statusConfig[task.status].icon
          return (
            <motion.div
              key={task.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-900/50"
            >
              <StatusIcon
                className={cn(
                  "size-4 shrink-0",
                  statusConfig[task.status].color,
                  task.status === "in_progress" && "animate-spin"
                )}
              />

              <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{task.title}</span>

              <div className="flex shrink-0 items-center gap-2">
                {task.labels.map((label) => (
                  <span
                    key={label}
                    className="hidden rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline"
                  >
                    {label}
                  </span>
                ))}

                <span
                  className={cn("size-2 rounded-full", priorityConfig[task.priority].color)}
                  title={priorityConfig[task.priority].label}
                />

                {task.assignee && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                    {task.assignee}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Feature 2 - Memory mock data                                              */
/* -------------------------------------------------------------------------- */

interface MemoryItem {
  type: "fact" | "decision" | "preference" | "learning"
  content: string
  tags: string[]
  age: string
}

const mockMemories: MemoryItem[] = [
  {
    type: "fact",
    content: "Auth uses JWT with RS256 algorithm and 24h token expiry",
    tags: ["auth", "security"],
    age: "3d ago",
  },
  {
    type: "decision",
    content: "Exponential backoff with jitter for webhook retries, max 5 attempts",
    tags: ["webhooks", "reliability"],
    age: "1d ago",
  },
  {
    type: "preference",
    content: "Always use Zod schemas for API request validation, not manual checks",
    tags: ["api", "validation"],
    age: "5d ago",
  },
  {
    type: "learning",
    content: "Stripe webhook events can arrive out of order - must handle idempotently",
    tags: ["stripe", "gotcha"],
    age: "2d ago",
  },
]

const memoryTypeConfig: Record<
  MemoryItem["type"],
  { icon: typeof Brain; color: string; bg: string }
> = {
  fact: {
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  decision: {
    icon: Settings2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  preference: {
    icon: Tag,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  learning: {
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
}

function MemoryListVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0c]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-200">Memories</span>
          <span className="text-xs text-zinc-600">payments-api</span>
        </div>
        <span className="text-xs text-zinc-600">12 total</span>
      </div>

      {/* Memory items */}
      <div className="divide-y divide-zinc-800/60">
        {mockMemories.map((memory, i) => {
          const TypeIcon = memoryTypeConfig[memory.type].icon
          return (
            <motion.div
              key={memory.content}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              className="px-4 py-3 transition-colors hover:bg-zinc-900/50"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                    memoryTypeConfig[memory.type].bg
                  )}
                >
                  <TypeIcon className={cn("size-3.5", memoryTypeConfig[memory.type].color)} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-zinc-300">{memory.content}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        memoryTypeConfig[memory.type].bg,
                        memoryTypeConfig[memory.type].color
                      )}
                    >
                      {memory.type}
                    </span>
                    {memory.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-zinc-600">
                        #{tag}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-zinc-700">{memory.age}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Feature 3 - Context loading visual                                        */
/* -------------------------------------------------------------------------- */

interface ContextLine {
  label: string
  value: string
  icon: typeof Zap
  color: string
}

const contextLines: ContextLine[] = [
  {
    label: "Space",
    value: "payments-api",
    icon: Layers,
    color: "text-emerald-400",
  },
  {
    label: "Active Cycle",
    value: "Sprint 3 (4 days left)",
    icon: Clock,
    color: "text-amber-400",
  },
  {
    label: "Pending Tasks",
    value: "3 tasks across 2 labels",
    icon: CheckCircle2,
    color: "text-blue-400",
  },
  {
    label: "Open Issues",
    value: "2 issues (1 critical)",
    icon: ArrowUpRight,
    color: "text-red-400",
  },
  {
    label: "Memories Loaded",
    value: "12 memories (4 decisions, 3 facts, 3 learnings, 2 prefs)",
    icon: Brain,
    color: "text-violet-400",
  },
  {
    label: "AI Persona",
    value: "Senior backend engineer, concise, test-driven",
    icon: Zap,
    color: "text-cyan-400",
  },
]

function ContextVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0c]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-200">get_context</span>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          loaded in 120ms
        </span>
      </div>

      {/* Context lines */}
      <div className="divide-y divide-zinc-800/60">
        {contextLines.map((line, i) => {
          const Icon = line.icon
          return (
            <motion.div
              key={line.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <Icon className={cn("size-4 shrink-0", line.color)} />
              <span className="w-28 shrink-0 text-xs font-medium text-zinc-500">{line.label}</span>
              <span className="text-sm text-zinc-300">{line.value}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Feature blocks data                                                        */
/* -------------------------------------------------------------------------- */

interface FeatureBlock {
  badge: string
  badgeColor: string
  headline: string
  headlineAccent: string
  description: string
  bullets: string[]
  visual: React.ReactNode
}

const featureBlocks: FeatureBlock[] = [
  {
    badge: "Tasks & Issues",
    badgeColor: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    headline: "Full-featured project management,",
    headlineAccent: "built for AI.",
    description:
      "Your AI agents create, update, and complete tasks the same way a human engineer would. Custom workflows, priorities, labels, cycles, and estimates -- all through MCP tool calls.",
    bullets: [
      "Custom workflow statuses (backlog, in progress, review, done)",
      "Priority levels, severity, labels, and estimate points",
      "Sprint cycles with start/end dates and progress tracking",
      "Assignees for human-AI collaboration on shared boards",
    ],
    visual: <TaskListVisual />,
  },
  {
    badge: "Persistent Memory",
    badgeColor: "border-violet-500/30 bg-violet-500/5 text-violet-400",
    headline: "Your AI remembers",
    headlineAccent: "everything.",
    description:
      "Every architectural decision, debugging insight, and team preference is stored and recalled automatically. No more re-explaining your codebase every session.",
    bullets: [
      "Four memory types: facts, decisions, preferences, learnings",
      "Tag-based organization and full-text search",
      "Memories scoped per space, recalled per session",
      "Semantic search coming soon for intelligent recall",
    ],
    visual: <MemoryListVisual />,
  },
  {
    badge: "Space Context",
    badgeColor: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
    headline: "Full context,",
    headlineAccent: "every session.",
    description:
      "One tool call at the start of every session loads pending tasks, open issues, relevant memories, space config, active cycle, and your custom AI persona. Zero manual setup.",
    bullets: [
      "Active space, cycle, and config in a single call",
      "Pending tasks and open issues loaded automatically",
      "Recent memories surface relevant past decisions",
      "Custom AI persona shapes agent behavior per space",
    ],
    visual: <ContextVisual />,
  },
]

/* -------------------------------------------------------------------------- */
/*  Features section                                                           */
/* -------------------------------------------------------------------------- */

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl overflow-hidden px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            31 tools.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              Zero forgotten context.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Everything your AI agents need to manage work across sessions -- tasks, issues,
            memories, spaces, cycles, and config -- all through the Model Context Protocol.
          </p>
        </motion.div>

        {/* Feature blocks */}
        <div className="mt-20 space-y-28">
          {featureBlocks.map((feature, blockIndex) => {
            const isReversed = blockIndex % 2 === 1
            return (
              <div
                key={feature.badge}
                className={cn(
                  "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
                  isReversed && "lg:[direction:rtl]"
                )}
              >
                {/* Text column */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="min-w-0 lg:[direction:ltr]"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "mb-4 gap-1.5 px-2.5 py-1 text-xs font-medium",
                      feature.badgeColor
                    )}
                  >
                    {feature.badge}
                  </Badge>

                  <h3 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                    {feature.headline}{" "}
                    <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                      {feature.headlineAccent}
                    </span>
                  </h3>

                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>

                  <ul className="mt-6 space-y-2.5">
                    {feature.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2.5 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500/70" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Visual column */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="min-w-0 lg:[direction:ltr]"
                >
                  {feature.visual}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
