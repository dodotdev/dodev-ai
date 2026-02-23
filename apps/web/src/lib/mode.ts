export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  // Self-hosted requires explicit opt-in. Everything else is cloud.
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "self-hosted") return "self-hosted"
  if (process.env.DOMCP_SELF_HOSTED === "true") return "self-hosted"

  return "cloud"
}

export function isCloud(): boolean {
  return getMode() === "cloud"
}

export function isSelfHosted(): boolean {
  return getMode() === "self-hosted"
}
