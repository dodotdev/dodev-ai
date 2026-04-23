import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "@/components/providers/auth-provider"

export const Route = createFileRoute("/")({
  component: HomeRoute,
})

function HomeRoute() {
  const { user, isLoading, signOutUrl } = useAuth()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">dodev dashboard</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Vite + TanStack shell. Routes come online in Phase D of the conversion plan.
      </p>
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border border-border/50 bg-card px-2 py-1 font-mono">vite</span>
        <span className="rounded-md border border-border/50 bg-card px-2 py-1 font-mono">
          tanstack-router
        </span>
        <span className="rounded-md border border-border/50 bg-card px-2 py-1 font-mono">
          convex
        </span>
        <span className="rounded-md border border-border/50 bg-card px-2 py-1 font-mono">
          tailwind-v4
        </span>
      </div>

      <div className="mt-6 rounded-md border border-border/50 bg-card px-4 py-2 text-sm">
        {isLoading ? (
          <span className="text-muted-foreground">Resolving session…</span>
        ) : user ? (
          <div className="flex items-center gap-3">
            <span>
              Signed in as <span className="font-medium">{user.name ?? user.email}</span>
            </span>
            <a
              href={signOutUrl}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              sign out
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground">No session</span>
        )}
      </div>
    </div>
  )
}
