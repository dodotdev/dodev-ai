/**
 * Temporary store for pending OAuth authorization requests.
 *
 * When /authorize is called, we stash the PKCE code_challenge, redirect_uri,
 * state, and client_id, then redirect to WorkOS. When WorkOS calls back,
 * we retrieve these values to complete the flow.
 */

const PENDING_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface PendingAuth {
  /** PKCE code_challenge */
  codeChallenge: string
  /** Client's redirect_uri */
  redirectUri: string
  /** OAuth state parameter */
  state?: string
  /** OAuth client_id */
  clientId: string
  /** When this entry expires */
  expiresAt: number
}

/**
 * Keyed by a random `sessionToken` that we pass through WorkOS via the `state` parameter.
 * This is NOT the OAuth state — it's our internal correlation ID.
 */
const store = new Map<string, PendingAuth>()

export function storePendingAuth(
  sessionToken: string,
  entry: Omit<PendingAuth, "expiresAt">
): void {
  store.set(sessionToken, {
    ...entry,
    expiresAt: Date.now() + PENDING_TTL_MS,
  })
}

export function consumePendingAuth(sessionToken: string): PendingAuth | null {
  const entry = store.get(sessionToken)
  if (!entry) return null

  store.delete(sessionToken)

  if (Date.now() > entry.expiresAt) return null
  return entry
}

/** Periodic cleanup */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) {
      store.delete(key)
    }
  }
}, 60_000)
