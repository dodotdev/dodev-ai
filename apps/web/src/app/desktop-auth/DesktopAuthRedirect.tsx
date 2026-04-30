"use client"

import { useEffect, useState } from "react"

/**
 * Client-side redirector to the Electron main-process loopback server.
 *
 * Server-side redirect won't work — Next can only redirect to
 * same-origin paths or absolute URLs whitelisted by the framework, and
 * `http://127.0.0.1:<port>/...` is neither. So we bounce on mount via
 * `window.location.href`. We also render a manual button for cases
 * where the auto-redirect is blocked (rare, but worth the safety net).
 */
export function DesktopAuthRedirect({
  encoded,
  callbackPort,
}: {
  encoded: string
  callbackPort: string
}) {
  const callbackUrl = `http://127.0.0.1:${callbackPort}/auth/callback?payload=${encodeURIComponent(
    encoded
  )}`

  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    setRedirected(true)
    window.location.href = callbackUrl
  }, [callbackUrl])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold">Returning to dodev.ai…</h1>
        <p className="text-sm text-muted-foreground">
          {redirected
            ? "If the desktop app didn't refocus, click the button below."
            : "Hang on, signing you into the desktop app…"}
        </p>
        <a
          href={callbackUrl}
          className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          Open dodev.ai
        </a>
      </div>
    </main>
  )
}
