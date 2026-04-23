import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// In dev, proxy /api/auth/* to the marketing app so the browser sees a
// same-origin fetch and WorkOS session cookies flow naturally without
// SameSite=None/Secure shenanigans. In prod the dashboard uses absolute
// cross-subdomain URLs (VITE_MARKETING_ORIGIN) with credentials.
const MARKETING_PROXY_TARGET = process.env.VITE_MARKETING_PROXY ?? "http://localhost:3041"

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3042,
    proxy: {
      "/api/auth": {
        target: MARKETING_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
})
