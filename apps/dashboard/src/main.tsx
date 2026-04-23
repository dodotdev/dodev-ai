import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./globals.css"

import { RouterProvider } from "@tanstack/react-router"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { AuthProvider } from "./components/providers/auth-provider"
import { webSessionSource } from "./lib/session-source-web"
import { router } from "./router"

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set — copy .env.example to .env.local")
}

const convex = new ConvexReactClient(convexUrl)

function redirectToSignIn() {
  const returnTo = window.location.href
  window.location.href = webSessionSource.signInUrl(returnTo)
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("#root not found in index.html")

createRoot(rootEl).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <AuthProvider
        sessionSource={webSessionSource}
        fallback={<LoadingShell />}
        onUnauthenticated={redirectToSignIn}
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
