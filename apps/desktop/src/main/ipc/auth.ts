/**
 * Auth IPC bridge — sign in, sign out, read current session.
 *
 * Sign-in uses the askjubal pattern: open the browser to the marketing
 * site's `/desktop-auth` page, which after WorkOS auth posts back to a
 * one-shot loopback HTTP server in the main process. The payload is a
 * base64-encoded JSON of the user identity (workosUserId, email, name,
 * avatarUrl). We persist via auth-store (encrypted when the OS supports
 * it), then notify the renderer via `auth:session-changed` so it
 * re-renders.
 *
 * No keychain prompt. No WorkOS access/refresh JWT pair stored — our
 * dashboard derives all access from `apiKeyHash` looked up by
 * `workosUserId` in Convex, so identity is the only thing we need to
 * persist.
 */
import { createServer, type Server } from "node:http"
import { BrowserWindow, ipcMain, shell } from "electron"
import {
  authStateMeta,
  clearSession,
  type DesktopSession,
  loadSession,
  saveSession,
} from "../auth-store"

// In dev we always point sign-in at the local marketing dev server
// (port 3041). Honoring MAIN_WEB_URL would send users to dodev.ai,
// which breaks the local iteration loop. Production reads MAIN_WEB_URL
// from the env (electron-vite injects MAIN_* into import.meta.env).
const WEB_URL: string = (() => {
  const envUrl = import.meta.env.MAIN_WEB_URL
  if (typeof envUrl === "string" && envUrl.length > 0 && !import.meta.env.DEV) {
    return envUrl
  }
  return import.meta.env.DEV ? "http://localhost:3041" : "https://dodev.ai"
})()

let callbackServer: Server | null = null

function broadcastSessionChanged(session: DesktopSession | null): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("auth:session-changed", session)
  }
}

function startCallbackServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (callbackServer) {
      callbackServer.close()
      callbackServer = null
    }

    callbackServer = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost")

      if (url.pathname !== "/auth/callback") {
        res.writeHead(404)
        res.end()
        return
      }

      const payload = url.searchParams.get("payload")
      if (!payload) {
        res.writeHead(400, { "Content-Type": "text/html" })
        res.end(failureHtml("Missing payload"))
        return
      }

      let session: DesktopSession | null = null
      try {
        const decoded = Buffer.from(payload, "base64").toString("utf-8")
        const parsed = JSON.parse(decoded) as Partial<DesktopSession>
        if (!parsed.workosUserId || !parsed.email) {
          throw new Error("invalid payload")
        }
        session = {
          workosUserId: parsed.workosUserId,
          email: parsed.email,
          name: parsed.name,
          avatarUrl: parsed.avatarUrl,
          persistedAt: Date.now(),
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/html" })
        res.end(failureHtml(err instanceof Error ? err.message : "Invalid payload"))
        return
      }

      saveSession(session)
      broadcastSessionChanged(session)

      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(successHtml())

      // Surface and focus the desktop window so the user lands back in
      // the app after closing the browser tab.
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }

      // Tear the server down on a short delay — no need to keep listening.
      setTimeout(() => {
        callbackServer?.close()
        callbackServer = null
      }, 1_000)
    })

    callbackServer.on("error", reject)
    callbackServer.listen(0, "127.0.0.1", () => {
      const addr = callbackServer?.address()
      if (addr && typeof addr === "object") {
        resolve(addr.port)
      } else {
        reject(new Error("Failed to start auth callback server"))
      }
    })
  })
}

function successHtml(): string {
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0a0a0a;color:#fff">
<div style="text-align:center">
  <h1 style="font-size:1.25rem;font-weight:500;margin:0 0 0.5rem 0">You're signed in</h1>
  <p style="color:#9ca3af;font-size:0.875rem">You can close this tab and return to dodev.ai.</p>
</div>
</body></html>`
}

function failureHtml(message: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0a0a0a;color:#fff">
<div style="text-align:center;max-width:400px;padding:0 1rem">
  <h1 style="font-size:1.25rem;font-weight:500;margin:0 0 0.5rem 0">Sign-in failed</h1>
  <p style="color:#9ca3af;font-size:0.875rem">${message}</p>
</div>
</body></html>`
}

export function registerAuthHandlers(): void {
  ipcMain.handle("auth:signIn", async () => {
    const port = await startCallbackServer()
    const returnTo = encodeURIComponent(`/desktop-auth?callbackPort=${port}`)
    const authUrl = `${WEB_URL}/auth/sign-in?returnTo=${returnTo}`
    await shell.openExternal(authUrl)
    return { ok: true as const, port }
  })

  ipcMain.handle("auth:signOut", async () => {
    clearSession()
    broadcastSessionChanged(null)
    return { ok: true as const }
  })

  ipcMain.handle("auth:getSession", async () => {
    return loadSession()
  })

  // Diagnostic only — exposed for the renderer's "About" / debug panel.
  ipcMain.handle("auth:diag", async () => {
    return authStateMeta()
  })
}
