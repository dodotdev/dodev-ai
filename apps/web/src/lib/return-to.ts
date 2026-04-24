const DASHBOARD_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN,
    "https://app.dodev.ai",
    "http://localhost:3042",
    "http://app.localhost:3041",
  ].filter(Boolean) as string[]
)

export function sanitizeReturnTo(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback

  if (raw.startsWith("/") && !raw.startsWith("//")) return raw

  try {
    const url = new URL(raw)
    if (DASHBOARD_ORIGINS.has(url.origin)) return url.toString()
  } catch {
    // fall through
  }
  return fallback
}
