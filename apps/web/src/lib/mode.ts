export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  if (process.env.NEXT_PUBLIC_DOMCP_MODE) {
    return process.env.NEXT_PUBLIC_DOMCP_MODE === "cloud" ? "cloud" : "self-hosted"
  }
  // Auto-detect: if WorkOS is configured, we're in cloud mode
  return process.env.WORKOS_CLIENT_ID ? "cloud" : "self-hosted"
}

export function isCloud(): boolean {
  return getMode() === "cloud"
}

export function isSelfHosted(): boolean {
  return getMode() === "self-hosted"
}
