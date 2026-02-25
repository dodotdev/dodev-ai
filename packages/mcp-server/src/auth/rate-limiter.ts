import type { PlanTier } from "@dodev/shared"
import { RATE_LIMITS } from "@dodev/shared"

interface SlidingWindow {
  timestamps: number[]
}

const windows = new Map<string, SlidingWindow>()

/** Check if a request is within rate limits */
export function checkRateLimit(userId: string, plan: PlanTier): boolean {
  const config = RATE_LIMITS[plan]
  const now = Date.now()

  let window = windows.get(userId)
  if (!window) {
    window = { timestamps: [] }
    windows.set(userId, window)
  }

  // Remove expired timestamps
  const cutoff = now - config.windowMs
  window.timestamps = window.timestamps.filter((t) => t > cutoff)

  // Check limit
  if (window.timestamps.length >= config.maxRequests) {
    return false
  }

  // Record this request
  window.timestamps.push(now)
  return true
}

/** Reset rate limit state (for testing) */
export function resetRateLimits(): void {
  windows.clear()
}
