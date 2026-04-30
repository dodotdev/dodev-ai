import { contextBridge, ipcRenderer } from "electron"

/**
 * Identity persisted on the desktop side.
 *
 * Mirrors the SessionUser shape the dashboard's web SessionSource
 * returns, plus a `persistedAt` timestamp for diagnostics. The renderer
 * only ever reads — writes happen in the main process via IPC after a
 * loopback sign-in callback.
 */
interface DesktopSession {
  workosUserId: string
  email: string
  name?: string
  avatarUrl?: string
  persistedAt: number
}

interface AuthDiag {
  path: string
  exists: boolean
  encryptionAvailable: boolean
}

const dodev = {
  isDesktop: true as const,

  auth: {
    /** Open the system browser at the marketing sign-in page; resolves once
     *  the loopback server is listening. The actual session lands via
     *  `onSessionChanged`. */
    signIn: (): Promise<{ ok: true; port: number }> => ipcRenderer.invoke("auth:signIn"),

    signOut: (): Promise<{ ok: true }> => ipcRenderer.invoke("auth:signOut"),

    /** Returns the persisted session, or null if not signed in. */
    getSession: (): Promise<DesktopSession | null> => ipcRenderer.invoke("auth:getSession"),

    /** Diagnostic — file path, exists, encryptionAvailable. */
    diag: (): Promise<AuthDiag> => ipcRenderer.invoke("auth:diag"),

    /** Subscribe to session changes (sign-in callback completed, sign-out fired).
     *  Returns an unsubscribe function. */
    onSessionChanged: (cb: (session: DesktopSession | null) => void): (() => void) => {
      const listener = (_e: unknown, session: DesktopSession | null) => cb(session)
      ipcRenderer.on("auth:session-changed", listener)
      return () => {
        ipcRenderer.removeListener("auth:session-changed", listener)
      }
    },
  },
}

try {
  contextBridge.exposeInMainWorld("dodev", dodev)
  console.log("[preload] window.dodev exposed (isDesktop=true)")
} catch (error) {
  console.error("[preload] failed to expose dodev API:", error)
}

export type DodevBridge = typeof dodev
