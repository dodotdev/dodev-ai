"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import {
  Activity,
  AlertCircle,
  Brain,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  User,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isCloud } from "@/lib/mode"
import { cn } from "@/lib/utils"

const SUB_ITEMS = [
  { key: "tasks", label: "Tasks", icon: CheckSquare, href: "" },
  { key: "issues", label: "Issues", icon: AlertCircle, href: "/issues" },
  { key: "memories", label: "Memories", icon: Brain, href: "/memories" },
  { key: "activity", label: "Activity", icon: Activity, href: "/activity" },
]

const GLOBAL_ITEMS = [
  { label: "Memories", icon: Brain, href: "/dashboard/memories" },
  { label: "Tasks", icon: CheckSquare, href: "/dashboard/tasks" },
  { label: "Issues", icon: AlertCircle, href: "/dashboard/issues" },
  { label: "Activity", icon: Activity, href: "/dashboard/activity" },
]

interface DashboardSidebarProps {
  onNavigate?: () => void
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const { user, apiKeyHash } = useAuth()

  const projects = useQuery(api.projects.list, apiKeyHash ? { apiKeyHash } : "skip")

  const createProject = useMutation(api.projects.create)

  const userName = user?.name || user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || ""
  const userPlan = (user?.plan as string) || "free"
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Auto-expand the project whose sub-page is currently active
  const activeProjectId = projects?.find((p) => pathname.startsWith(`/dashboard/projects/${p._id}`))
    ?._id as string | undefined

  if (activeProjectId && !expandedProjects.has(activeProjectId)) {
    setExpandedProjects((prev) => new Set(prev).add(activeProjectId))
  }

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <div className="flex h-full flex-col bg-surface dark:bg-background">
      <div className="flex-1 overflow-y-auto p-3">
        {/* Overview */}
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
          )}
        >
          <LayoutDashboard className="size-5 shrink-0" />
          Overview
        </Link>

        {/* Global section */}
        <div className="mt-5">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Global
          </p>
          <div className="space-y-0.5">
            {GLOBAL_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Projects section */}
        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between px-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Projects
            </p>
            <button
              type="button"
              onClick={() => setNewProjectOpen(true)}
              className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
              title="New project"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {(projects ?? [])
              .filter((p) => (p as { status: string }).status !== "archived")
              .map((project) => {
                const id = project._id as string
                const isExpanded = expandedProjects.has(id)
                const base = `/dashboard/projects/${id}`
                const isProjectActive = pathname.startsWith(base)

                return (
                  <div key={id}>
                    {/* Project row */}
                    <button
                      type="button"
                      onClick={() => toggleProject(id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        isProjectActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
                      )}
                    >
                      <FolderOpen className="size-4 shrink-0" />
                      <span className="flex-1 truncate text-left">{project.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/50" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                      )}
                    </button>

                    {/* Sub-items */}
                    {isExpanded && (
                      <div className="ml-[22px] space-y-0.5 border-l border-border pl-3">
                        {SUB_ITEMS.map((sub) => {
                          const Icon = sub.icon
                          const href = `${base}${sub.href}`
                          const active =
                            sub.href === ""
                              ? pathname === base
                              : pathname === href || pathname.startsWith(href)

                          return (
                            <Link
                              key={sub.key}
                              href={href}
                              onClick={onNavigate}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
                                active
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
                              )}
                            >
                              <Icon className="size-3.5 shrink-0" />
                              {sub.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

            {projects !== undefined && projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
            )}
          </div>
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
                  1 project &middot; 100 tasks &middot; 50 memories
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

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive("/dashboard/settings")
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-accent"
          )}
        >
          <Settings className="size-5 shrink-0" />
          Settings
        </Link>

        {isCloud() && (
          <>
            <hr className="my-3 border-t border-border" />

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <Avatar className="size-6">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={userName} />}
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

            <div
              className={cn(
                "relative ml-4 transition-all duration-300 ease-in-out",
                userMenuOpen
                  ? "mt-2 max-h-96 opacity-100"
                  : "mt-0 max-h-0 overflow-hidden opacity-0"
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
                <a
                  href="/auth/sign-out"
                  className="flex items-center gap-3 rounded-md py-2 pl-8 pr-2 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-accent"
                >
                  <LogOut className="size-4 shrink-0" />
                  Sign Out
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreate={async (data) => {
          if (!apiKeyHash) return
          const result = await createProject({
            apiKeyHash,
            name: data.name,
            slug: data.slug,
            description: data.description,
          })
          if (result) {
            const id = (result as { _id: string })._id
            setExpandedProjects((prev) => new Set(prev).add(id))
            router.push(`/dashboard/projects/${id}`)
            onNavigate?.()
          }
          setNewProjectOpen(false)
        }}
      />
    </div>
  )
}

function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; slug?: string; description?: string }) => void
}) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")

  function deriveSlug(projectName: string): string {
    const words = projectName.trim().split(/\s+/)
    if (words.length >= 2) {
      return words
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5)
    }
    return words[0]?.toUpperCase().slice(0, 5) ?? ""
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    onCreate({
      name: name.trim(),
      slug: slug.trim().toUpperCase() || undefined,
      description: description.trim() || undefined,
    })

    setName("")
    setSlug("")
    setDescription("")
  }

  // Reset form when dialog opens
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setName("")
      setSlug("")
      setDescription("")
    }
    onOpenChange(isOpen)
  }

  const previewSlug = slug.trim().toUpperCase() || deriveSlug(name)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-visible">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Every project gets its own memories, tasks, and issues.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-project-name">Name</Label>
              <Input
                id="new-project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-project-slug">Identifier</Label>
              <Input
                id="new-project-slug"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 5)
                  )
                }
                placeholder={deriveSlug(name) || "ABC"}
                className="w-20 text-center font-mono uppercase"
                maxLength={5}
              />
            </div>
          </div>
          {previewSlug && (
            <p className="text-xs text-muted-foreground">
              Items will be numbered{" "}
              <span className="font-mono font-medium text-foreground">{previewSlug}-1</span>,{" "}
              <span className="font-mono font-medium text-foreground">{previewSlug}-2</span>, ...
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="new-project-desc">Description</Label>
            <Textarea
              id="new-project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
