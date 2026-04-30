/**
 * Electron-flavored SessionSource — reads identity from the main
 * process via the `window.dodev.auth.*` IPC bridge instead of fetching
 * cross-origin cookies from the marketing app.
 *
 * The shape it returns is identical to `webSessionSource` so the
 * existing `AuthProvider` and Convex `users.getByWorkosId` lookup work
 * unchanged. apiKeyHash is still derived from the Convex user record;
 * we don't try to persist it on the desktop because rotating it on the
 * cloud should immediately invalidate desktop sessions.
 */
import type { SessionSource, SessionUser } from "./session-source"

interface DesktopBridgeSession {
  workosUserId: string
  email: string
  name?: string
  avatarUrl?: string
  persistedAt: number
}

interface DesktopAuthBridge {
  signIn(): Promise<{ ok: true; port: number }>
  signOut(): Promise<{ ok: true }>
  getSession(): Promise<DesktopBridgeSession | null>
  onSessionChanged(cb: (session: DesktopBridgeSession | null) => void): () => void
}

interface DodevBridge {
  isDesktop: true
  auth: DesktopAuthBridge
}

declare global {
  interface Window {
    dodev?: DodevBridge
  }
}

function bridge(): DesktopAuthBridge {
  const dodev = window.dodev
  if (!dodev) {
    throw new Error(
      "session-source-electron: window.dodev is not exposed. Did the preload script load?"
    )
  }
  return dodev.auth
}

function toSessionUser(s: DesktopBridgeSession | null): SessionUser | null {
  if (!s) return null
  return {
    workosUserId: s.workosUserId,
    email: s.email,
    name: s.name,
    avatarUrl: s.avatarUrl,
  }
}

export const electronSessionSource: SessionSource = {
  async fetchSession(): Promise<SessionUser | null> {
    const session = await bridge().getSession()
    return toSessionUser(session)
  },

  signInUrl(_returnTo: string): string {
    // The desktop flow doesn't navigate the renderer to a sign-in URL.
    // It opens the system browser via IPC. Returning a synthetic URL
    // here keeps the SessionSource interface uniform; AuthProvider's
    // `onUnauthenticated` should call `desktopSignIn()` instead of
    // following this URL on Electron.
    return "dodev://desktop-sign-in"
  },

  signOutUrl(): string {
    return "dodev://desktop-sign-out"
  },
}

/**
 * Trigger the sign-in browser flow. Resolves when the loopback server
 * has started listening; the actual session lands asynchronously via
 * `subscribeToSessionChanges`.
 */
export async function desktopSignIn(): Promise<void> {
  await bridge().signIn()
}

/** Sign out: clear the persisted session file in main process. */
export async function desktopSignOut(): Promise<void> {
  await bridge().signOut()
}

/**
 * Subscribe to session changes from the main process. Used by the
 * AuthProvider on Electron to refresh after a sign-in callback fires.
 */
export function subscribeToDesktopSessionChanges(
  cb: (session: SessionUser | null) => void
): () => void {
  return bridge().onSessionChanged((s) => cb(toSessionUser(s)))
}

/** True when running inside the dodev Electron shell. */
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.dodev?.isDesktop
}
