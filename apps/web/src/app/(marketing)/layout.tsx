import { api } from "@dodev/convex/api"
import { cookies } from "next/headers"
import { Footer } from "@/components/marketing/footer"
import { Navbar } from "@/components/marketing/navbar"
import { getConvexClient } from "@/lib/convex"
import { isCloud } from "@/lib/mode"

async function getMarketingUser(): Promise<{
  email: string
  name?: string
  isApproved?: boolean
} | null> {
  // Self-hosted mode: no user on marketing pages (dashboard handles its own auth)
  if (!isCloud()) return null

  try {
    // Only attempt WorkOS auth if we have a session cookie
    const cookieStore = await cookies()
    const hasSession = cookieStore.getAll().some((c) => c.name.startsWith("wos-session"))
    if (!hasSession) return null

    const { withAuth } = await import("@workos-inc/authkit-nextjs")
    const { user } = await withAuth()
    if (!user) return null

    // Check Convex for user approval status
    let isApproved = false
    try {
      const convex = getConvexClient()
      const convexUser = await convex.query(api.users.getByWorkosId, {
        workosUserId: user.id,
      })
      isApproved = convexUser?.role === "approved" || convexUser?.role === "admin"
    } catch {
      // If Convex check fails, default to not approved
    }

    return {
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      isApproved,
    }
  } catch {
    return null
  }
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getMarketingUser()

  return (
    <>
      <Navbar user={user} />
      <main className="overflow-x-hidden">{children}</main>
      <Footer />
    </>
  )
}
