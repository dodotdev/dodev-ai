"use client"

import { Github, ListTodo, Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardSidebar } from "./dashboard-sidebar"

export function DashboardHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-[68px] items-center border-b border-border bg-white dark:bg-background">
        <nav className="flex h-[68px] w-full items-center px-4 lg:px-8">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
              <ListTodo className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight">DoMCP.ai</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            <a
              href="https://github.com/dodotdev/domcp-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="size-4" />
              <span className="hidden sm:inline">Docs</span>
            </a>

            <ThemeToggle />

            {/* Mobile menu button */}
            <button
              type="button"
              className="-mr-2 flex items-center justify-center p-3 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay backdrop dismiss */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss */}
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed bottom-0 right-0 top-[68px] z-50 w-[280px] overflow-y-auto bg-white shadow-xl dark:bg-background lg:hidden">
            <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
