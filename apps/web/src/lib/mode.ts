export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  // Check build-time inlined var first
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "cloud") return "cloud"
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "self-hosted") return "self-hosted"

  // Server-side runtime checks (not inlined, available in server components)
  if (process.env.WORKOS_CLIENT_ID) return "cloud"
  if (process.env.WORKOS_API_KEY) return "cloud"

  return "self-hosted"
}

export function isCloud(): boolean {
  return getMode() === "cloud"
}

export function isSelfHosted(): boolean {
  return getMode() === "self-hosted"
}
