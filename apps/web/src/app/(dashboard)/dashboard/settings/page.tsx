"use client"

import { api } from "@dodev/convex/api"
import { PLAN_LIMITS } from "@dodev/shared"
import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { ApiKeyDisplay } from "@/components/dashboard/api-key-display"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { isCloud } from "@/lib/mode"

export default function SettingsPage() {
  const { user, apiKeyHash, isLoading: authLoading } = useAuth()

  const usage = useQuery(api.usage.getCurrentUsage, apiKeyHash ? { apiKeyHash } : "skip")

  const regenerateApiKey = useMutation(api.users.regenerateApiKey)

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const plan = (user.plan as "free" | "pro" | "team") || "free"
  const limits = PLAN_LIMITS[plan]
  const currentUsage = {
    taskCount: usage?.taskCount ?? 0,
    memoryCount: usage?.memoryCount ?? 0,
    projectCount: usage?.projectCount ?? 0,
    apiCalls: usage?.apiCalls ?? 0,
  }

  async function handleRegenerate() {
    if (!user) return
    await regenerateApiKey({ workosUserId: user.workosUserId })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and API access</p>
      </div>

      {/* API Key */}
      <ApiKeyDisplay apiKey={user.apiKey} onRegenerate={handleRegenerate} />

      {isCloud() && (
        <>
          <Separator />

          {/* Plan & Usage (cloud only) */}
          <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Plan</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {plan}
                  </Badge>
                </div>
              </div>
              {plan === "free" && (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <UsageBar label="Tasks" current={currentUsage.taskCount} limit={limits.tasks} />
              <UsageBar
                label="Memories"
                current={currentUsage.memoryCount}
                limit={limits.memories}
              />
              <UsageBar
                label="Projects"
                current={currentUsage.projectCount}
                limit={limits.projects}
              />
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Account */}
      <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card">
        <h3 className="text-sm font-medium">Account</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm">{user.name || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">API Calls (this month)</span>
            <span className="text-sm tabular-nums">{currentUsage.apiCalls}</span>
          </div>
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = limit === Number.POSITIVE_INFINITY ? 0 : Math.min((current / limit) * 100, 100)
  const isUnlimited = limit === Number.POSITIVE_INFINITY

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {current} / {isUnlimited ? "Unlimited" : limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
