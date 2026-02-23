import { getConvexClient } from "./convex"
import { api } from "@domcp/convex/api"

export async function getSelfHostedUser() {
  const convex = getConvexClient()

  // Look up the well-known self-hosted user
  const existing = await convex.query(api.users.getByWorkosId, {
    workosUserId: "self-hosted",
  })
  if (existing) return existing

  // First visit — auto-create the self-hosted user
  return await convex.mutation(api.users.createSelfHostedUser, {})
}
