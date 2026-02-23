export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  // Explicit override takes priority
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "cloud") return "cloud"
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "self-hosted") return "self-hosted"

  // Vercel automatically sets VERCEL=1 on all deployments — always cloud
  if (process.env.VERCEL) return "cloud"

  // Server-side runtime fallbacks
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
