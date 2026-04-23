import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "@/components/providers/auth-provider"

export const Route = createFileRoute("/dashboard/")({
  component: OverviewRoute,
})

function OverviewRoute() {
  const { user } = useAuth()
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back{user?.name ? `, ${user.name}` : ""}. The overview page is the first real ported
        route in the Vite dashboard — the sidebar above is the same component as the Next.js app.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-border/40 bg-card p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Conversion status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Phase A — scaffold
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Phase B — cross-origin session
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Phase C — sidebar + overview route
            </li>
            <li className="flex items-center gap-2 text-muted-foreground/70">
              <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
              Phase D — flat routes (tasks, issues, memories, activity, spaces, settings)
            </li>
            <li className="flex items-center gap-2 text-muted-foreground/70">
              <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
              Phase E — dynamic space routes
            </li>
          </ul>
        </section>
        <section className="rounded-lg border border-border/40 bg-card p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Session</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-mono text-xs">{user?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-mono text-xs uppercase">{user?.plan ?? "—"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
