import { ConvexHttpClient } from "convex/browser"
import { anyApi } from "convex/server"

let client: ConvexHttpClient | null = null

/**
 * Untyped API reference for calling Convex functions.
 * Uses anyApi so we don't depend on generated types at build time.
 * The Convex functions are defined in packages/convex/convex/.
 */
export const api = anyApi

/** Get or create the Convex HTTP client */
export function getConvexClient(): ConvexHttpClient {
  if (client) return client

  const url = process.env.CONVEX_URL
  if (!url) {
    throw new Error("CONVEX_URL environment variable is required")
  }

  client = new ConvexHttpClient(url)
  return client
}
