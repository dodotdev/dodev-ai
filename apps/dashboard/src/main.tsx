import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./globals.css"

import { RouterProvider } from "@tanstack/react-router"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { DesktopSignInScreen } from "./components/dashboard/desktop-sign-in/desktop-sign-in-screen"
import { AuthProvider } from "./components/providers/auth-provider"
import {
  electronSessionSource,
  isElectron,
  subscribeToDesktopSessionChanges,
} from "./lib/session-source-electron"
import { webSessionSource } from "./lib/session-source-web"
import { router } from "./router"

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set — copy .env.example to .env.local")
}

const convex = new ConvexReactClient(convexUrl)

// Runtime target detection — same dashboard bundle serves both web and
// Electron (see electron.vite.config.ts for the architecture rationale).
// Electron exposes window.dodev via the preload bridge.
const onElectron = isElectron()
const sessionSource = onElectron ? electronSessionSource : webSessionSource
console.log(`[dodev:boot] runtime=${onElectron ? "electron" : "web"}`)

function redirectToSignIn() {
  if (onElectron) {
    // No-op on Electron. The DesktopSignInScreen rendered by
    // `unauthedFallback` handles sign-in via a click instead of an
    // auto-redirect — much better UX than popping a browser tab the
    // user didn't ask for.
    return
  }
  const returnTo = window.location.href
  window.location.href = webSessionSource.signInUrl(returnTo)
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("#root not found in index.html")

createRoot(rootEl).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <AuthProvider
        sessionSource={sessionSource}
        fallback={<LoadingShell />}
        unauthedFallback={onElectron ? <DesktopSignInScreen /> : undefined}
        onUnauthenticated={redirectToSignIn}
        subscribe={onElectron ? subscribeToDesktopSessionChanges : undefined}
      >
        <RouterProvider router={router} />
      </AuthProvider>
    </ConvexProvider>
  </StrictMode>
)

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
      <span className="text-sm">Loading…</span>
    </div>
  )
}
