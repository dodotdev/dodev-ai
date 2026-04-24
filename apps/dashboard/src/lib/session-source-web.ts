import type { SessionSource, SessionUser } from "./session-source"

/**
 * In dev, VITE_MARKETING_ORIGIN is blank and fetches go to relative paths,
 * proxied by the Vite dev server to the marketing app (see vite.config.ts).
 * In prod builds this is set to https://dodev.ai and fetches go
 * cross-subdomain with credentials; the marketing app's CORS config allows
 * app.dodev.ai.
 */
const MARKETING_ORIGIN = import.meta.env.VITE_MARKETING_ORIGIN ?? ""

function marketingUrl(path: string): string {
  return `${MARKETING_ORIGIN}${path}`
}

export const webSessionSource: SessionSource = {
  async fetchSession(): Promise<SessionUser | null> {
    const res = await fetch(marketingUrl("/api/auth/session"), {
      credentials: "include",
    })
    if (!res.ok) return null
    const body = (await res.json()) as { user: SessionUser | null }
    return body.user
  },
  signInUrl(returnTo: string): string {
    return marketingUrl(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
  },
  signOutUrl(): string {
    return marketingUrl("/auth/sign-out")
  },
}
