export type DeployMode = "cloud" | "self-hosted"

export function getMode(): DeployMode {
  const mode = import.meta.env.VITE_DODEV_MODE
  if (mode === "cloud") return "cloud"
  if (mode === "self-hosted") return "self-hosted"
  return "self-hosted"
}

export function isCloud(): boolean {
  return getMode() === "cloud"
}

export function isSelfHosted(): boolean {
  return getMode() === "self-hosted"
}
