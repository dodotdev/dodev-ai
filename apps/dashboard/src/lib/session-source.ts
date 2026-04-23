/**
 * Abstraction over "how this app gets the current user session."
 *
 * Two implementations planned:
 *   - `session-source-web.ts`   — fetches from the marketing app via
 *     cross-subdomain cookie. Used when the dashboard is served at
 *     app.dodev.ai.
 *   - `session-source-electron.ts` (future, PRD phase 3) — reads the API
 *     key from the OS keychain via an IPC bridge exposed on `window.dodev`.
 *     The return shape is identical so the AuthProvider doesn't care which
 *     environment it's running in.
 */

export interface SessionUser {
  workosUserId: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface SessionSource {
  /** Returns the authed user or null. Throws only on unexpected failures. */
  fetchSession(): Promise<SessionUser | null>
  /** URL to send unauthed users to. `returnTo` is an absolute URL. */
  signInUrl(returnTo: string): string
  /** URL that clears the session (logout). */
  signOutUrl(): string
}
