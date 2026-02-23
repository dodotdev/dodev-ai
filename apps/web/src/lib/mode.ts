export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  return process.env.NEXT_PUBLIC_DOMCP_MODE === "cloud" ? "cloud" : "self-hosted"
}

export function isCloud(): boolean {
  return getMode() === "cloud"
}

export function isSelfHosted(): boolean {
  return getMode() === "self-hosted"
}
