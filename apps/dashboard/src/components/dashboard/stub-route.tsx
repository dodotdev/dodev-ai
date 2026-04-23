/**
 * Placeholder shown while a route is still pending port in the Next.js ->
 * Vite conversion. Every route the sidebar links to needs to exist for
 * TanStack's typed <Link to=...> to typecheck; this component is the
 * one-liner body used by every stub in routes/ until Phase D/E lands the
 * real implementation.
 */
interface StubRouteProps {
  title: string
  phase: "D" | "E"
  note?: string
}

export function StubRoute({ title, phase, note }: StubRouteProps) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder. This view lands in Phase {phase} of the Next.js → Vite conversion (see{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          docs/PLAN_CONVERT_VITE.md
        </code>
        ).
      </p>
      {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  )
}
