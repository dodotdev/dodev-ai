import { httpRouter } from "convex/server"
import { api } from "./_generated/api"
import { httpAction } from "./_generated/server"

const http = httpRouter()

// Stripe webhook endpoint (Phase 3)
// http.route({
//   path: "/stripe/webhook",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => { ... }),
// })

// File serving route — redirects to the Convex storage URL.
// Requires ?apiKeyHash=<hash> query parameter for authentication.
http.route({
  path: "/files/{storageId}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Validate API key hash from query parameter.
    // Parse query string manually since Convex runtime types don't include URL.
    const rawUrl = request.url
    const queryStart = rawUrl.indexOf("?")
    const queryString = queryStart >= 0 ? rawUrl.slice(queryStart + 1) : ""

    let apiKeyHash: string | undefined
    for (const part of queryString.split("&")) {
      const eqIdx = part.indexOf("=")
      if (eqIdx < 0) continue
      const key = decodeURIComponent(part.slice(0, eqIdx))
      if (key === "apiKeyHash") {
        apiKeyHash = decodeURIComponent(part.slice(eqIdx + 1))
        break
      }
    }

    if (!apiKeyHash) {
      return new Response("Unauthorized: missing apiKeyHash query parameter", { status: 401 })
    }

    const user = await ctx.runQuery(api.users.getByApiKeyHash, {
      apiKeyHash: apiKeyHash as string,
    })
    if (!user) {
      return new Response("Unauthorized: invalid API key", { status: 401 })
    }

    // Extract storageId from the path portion (before any query string)
    const pathPart = queryStart >= 0 ? rawUrl.slice(0, queryStart) : rawUrl
    const segments = pathPart.split("/")
    const storageId = segments[segments.length - 1]
    if (!storageId) {
      return new Response("Not found", { status: 404 })
    }
    const fileUrl = await ctx.storage.getUrl(storageId as any)
    if (!fileUrl) {
      return new Response("Not found", { status: 404 })
    }
    return Response.redirect(fileUrl, 302)
  }),
})

export default http
