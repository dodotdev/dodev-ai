/**
 * Temporary store for OAuth authorization codes.
 *
 * Authorization codes are short-lived (10 minutes) and one-time-use.
 * They bridge the gap between WorkOS callback and token exchange.
 */

const AUTH_CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface AuthCodeEntry {
  /** The authorization code issued to the client */
  code: string
  /** PKCE code_challenge from the original /authorize request */
  codeChallenge: string
  /** OAuth client ID */
  clientId: string
  /** redirect_uri from the original /authorize request */
  redirectUri: string
  /** WorkOS user ID resolved after login */
  workosUserId: string
  /** User email from WorkOS */
  email?: string
  /** When this entry expires */
  expiresAt: number
}

const store = new Map<string, AuthCodeEntry>()

/** Store an auth code after WorkOS callback resolves the user. */
export function storeAuthCode(entry: Omit<AuthCodeEntry, "expiresAt">): void {
  store.set(entry.code, {
    ...entry,
    expiresAt: Date.now() + AUTH_CODE_TTL_MS,
  })
}

/** Consume an auth code (one-time use). Returns null if expired or missing. */
export function consumeAuthCode(code: string): AuthCodeEntry | null {
  const entry = store.get(code)
  if (!entry) return null

  // Always delete — one-time use
  store.delete(code)

  if (Date.now() > entry.expiresAt) return null
  return entry
}

/** Get the code_challenge for a given auth code (without consuming it). */
export function getCodeChallenge(code: string): string | null {
  const entry = store.get(code)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(code)
    return null
  }
  return entry.codeChallenge
}

/** Periodic cleanup of expired entries */
setInterval(() => {
  const now = Date.now()
  for (const [code, entry] of store) {
    if (now > entry.expiresAt) {
      store.delete(code)
    }
  }
}, 60_000) // Clean up every minute
