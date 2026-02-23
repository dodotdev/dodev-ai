"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Board", href: "" },
  { label: "Settings", href: "/settings" },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const base = `/dashboard/projects/${id}`

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const href = `${base}${tab.href}`
          const isActive = tab.href === "" ? pathname === base : pathname.startsWith(href)

          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
                isActive
                  ? "border-emerald-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
