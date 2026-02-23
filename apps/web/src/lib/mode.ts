export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "cloud") return "cloud"
  if (process.env.NEXT_PUBLIC_DOMCP_MODE === "self-hosted") return "self-hosted"

  return "self-hosted"
}

export function isCloud(): boolean {
  return getMode() === "cloud"
}

export function isSelfHosted(): boolean {
  return getMode() === "self-hosted"
}
