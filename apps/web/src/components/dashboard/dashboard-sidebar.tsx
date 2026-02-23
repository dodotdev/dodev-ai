"use client"

import {
  AlertCircle,
  Brain,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  FolderOpen,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { isCloud } from "@/lib/mode"

const mainNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
  { href: "/dashboard/todos", label: "Todos", icon: CheckSquare },
  { href: "/dashboard/issues", label: "Issues", icon: AlertCircle },
  { href: "/dashboard/memories", label: "Memories", icon: Brain },
]

const bottomNav = [{ href: "/dashboard/settings", label: "Settings", icon: Settings }]

interface DashboardSidebarProps {
  onNavigate?: () => void
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user } = useAuth()

  const userName = user?.name || user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || ""
  const userPlan = (user?.plan as string) || "free"
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <div className="flex h-full flex-col bg-surface dark:bg-background">
      {/* Main nav */}
      <div className="flex-1 p-3">
        <div className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="p-3">
        {/* Plan info (cloud only) */}
        {isCloud() && (
          <div className="mb-3 rounded-lg border border-border bg-white p-3 dark:bg-accent">
            <p className="text-xs font-medium text-foreground capitalize">{userPlan} Plan</p>
            {userPlan === "free" ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  1 project &middot; 100 todos &middot; 50 memories
                </p>
                <Link
                  href="/dashboard/settings"
                  onClick={onNavigate}
                  className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Upgrade &rarr;
                </Link>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Unlimited resources</p>
            )}
          </div>
        )}

        {/* Bottom nav items */}
        <div className="space-y-1">
          {bottomNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {isCloud() && (
          <>
            {/* Divider */}
            <hr className="my-3 border-t border-border" />

            {/* User menu (cloud only) */}
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <Avatar className="size-6">
                <AvatarFallback className="bg-emerald-500/10 text-[10px] font-semibold text-emerald-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-left">{userEmail}</span>
              {userMenuOpen ? (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {/* Expandable user menu */}
            <div
              className={cn(
                "relative ml-4 transition-all duration-300 ease-in-out",
                userMenuOpen ? "mt-2 max-h-96 opacity-100" : "mt-0 max-h-0 overflow-hidden opacity-0"
              )}
            >
              <div className="absolute bottom-0 left-3 top-0 w-px bg-border" />
              <div className="space-y-0.5">
                <Link
                  href="/dashboard/settings"
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-md py-2 pl-8 pr-2 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
                >
                  <User className="size-4 shrink-0" />
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-md py-2 pl-8 pr-2 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
                >
                  <CreditCard className="size-4 shrink-0" />
                  Billing
                </Link>
                <Link
                  href="/auth/sign-out"
                  className="flex items-center gap-3 rounded-md py-2 pl-8 pr-2 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
                >
                  <LogOut className="size-4 shrink-0" />
                  Sign Out
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
