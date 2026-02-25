"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"

const categories = [
  {
    id: "tasks",
    label: "Tasks",
    tools: ["create_task", "update_task", "complete_task", "list_tasks", "get_task", "delete_task"],
    example: {
      request: `{
  "tool": "create_task",
  "arguments": {
    "title": "Implement OAuth flow",
    "priority": "high",
    "tags": ["auth", "backend"],
    "dueDate": 1708992000000
  }
}`,
      response: `{
  "id": "j57a8k9...",
  "title": "Implement OAuth flow",
  "status": "pending",
  "priority": "high",
  "tags": ["auth", "backend"],
  "createdAt": 1708905600000
}`,
    },
  },
  {
    id: "memories",
    label: "Memories",
    tools: ["add_memory", "search_memories", "list_memories", "update_memory", "delete_memory"],
    example: {
      request: `{
  "tool": "search_memories",
  "arguments": {
    "query": "authentication approach",
    "limit": 5
  }
}`,
      response: `{
  "memories": [
    {
      "content": "Using JWT with 24h expiry.
        Refresh tokens stored in httpOnly
        cookies.",
      "tags": ["auth", "security"],
      "source": "claude-code"
    }
  ]
}`,
    },
  },
  {
    id: "projects",
    label: "Projects",
    tools: [
      "create_project",
      "list_projects",
      "get_project",
      "update_project",
      "archive_project",
      "set_active_project",
    ],
    example: {
      request: `{
  "tool": "create_project",
  "arguments": {
    "name": "backend-api",
    "description": "REST API service"
  }
}`,
      response: `{
  "id": "k82b3m1...",
  "name": "backend-api",
  "description": "REST API service",
  "status": "active",
  "createdAt": 1708905600000
}`,
    },
  },
  {
    id: "context",
    label: "Context",
    tools: ["get_context"],
    example: {
      request: `{
  "tool": "get_context",
  "arguments": {}
}`,
      response: `{
  "activeProject": {
    "name": "backend-api"
  },
  "taskSummary": {
    "pending": 5,
    "inProgress": 2,
    "topPending": [...]
  },
  "recentMemories": [...],
  "projects": [
    { "id": "...", "name": "backend-api" },
    { "id": "...", "name": "frontend" }
  ]
}`,
    },
  },
]

export function ToolShowcase() {
  const [activeTab, setActiveTab] = useState("tasks")
  const active = categories.find((c) => c.id === activeTab)!

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
            18 tools.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              One protocol.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Every tool returns clean JSON. Built on the Model Context Protocol standard.
          </p>
        </motion.div>

        <div className="mt-12">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-all",
                    activeTab === cat.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 lg:grid-cols-[200px_1fr_1fr]"
            >
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Tools
                </p>
                <ul className="space-y-1">
                  {active.tools.map((tool) => (
                    <li
                      key={tool}
                      className="rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Code blocks — always dark */}
              <div className="overflow-hidden rounded-xl border border-border bg-code-bg">
                <div className="border-b border-white/[0.06] px-4 py-2">
                  <span className="text-xs font-medium text-zinc-500">Request</span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-400">
                  <code>{active.example.request}</code>
                </pre>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-code-bg">
                <div className="border-b border-white/[0.06] px-4 py-2">
                  <span className="text-xs font-medium text-emerald-400">Response</span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-400">
                  <code>{active.example.response}</code>
                </pre>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
