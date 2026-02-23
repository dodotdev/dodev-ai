import { withAuth } from "@workos-inc/authkit-nextjs"

export interface AuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Get the current authenticated user from WorkOS session.
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
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
