import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"

const http = httpRouter()

// Stripe webhook endpoint (Phase 3)
// http.route({
//   path: "/stripe/webhook",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => { ... }),
// })

// File serving route — redirects to the Convex storage URL
http.route({
  path: "/files/{storageId}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const segments = request.url.split("/")
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
