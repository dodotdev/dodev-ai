import { isSelfHosted } from "./mode"

export interface AuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Get the current authenticated user.
 * In cloud mode, uses WorkOS session.
 * In self-hosted mode, returns a synthetic user (real Convex user is resolved in dashboard layout).
 */
export async function getUser(): Promise<AuthUser | null> {
  if (isSelfHosted()) {
    return {
      id: "self-hosted",
      email: "local@self-hosted",
      name: "Local User",
    }
  }

  try {
    const { withAuth } = await import("@workos-inc/authkit-nextjs")
    const { user } = await withAuth()
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    }
  } catch {
    return null
  }
}
