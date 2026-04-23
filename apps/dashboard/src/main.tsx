import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./globals.css"

import { RouterProvider } from "@tanstack/react-router"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { router } from "./router"

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set — copy .env.example to .env.local")
}

const convex = new ConvexReactClient(convexUrl)

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("#root not found in index.html")

createRoot(rootEl).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexProvider>
  </StrictMode>
)
