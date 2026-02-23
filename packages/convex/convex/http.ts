import { httpRouter } from "convex/server"

const http = httpRouter()

// Stripe webhook endpoint (Phase 3)
// http.route({
//   path: "/stripe/webhook",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => { ... }),
// })

export default http
