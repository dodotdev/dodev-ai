import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: HomeRoute,
})

function HomeRoute() {
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
    </div>
  )
}
