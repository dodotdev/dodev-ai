import { api } from "@dodev/convex/api"
import { redirect } from "next/navigation"
import { DashboardProviders } from "@/components/providers/dashboard-providers"
import { getUser } from "@/lib/auth"
import { getConvexClient } from "@/lib/convex"
import { isSelfHosted } from "@/lib/mode"
import { getSelfHostedUser } from "@/lib/self-hosted-auth"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isSelfHosted()) {
    const convexUser = await getSelfHostedUser()
    if (!convexUser) {
      throw new Error("Failed to resolve self-hosted user. Check DODEV_API_KEY.")
    }
    return (
      <DashboardProviders
        workosUserId={convexUser.workosUserId}
        email={convexUser.email}
        name={convexUser.name}
      >
        {children}
      </DashboardProviders>
    )
  }

  // Cloud mode: existing logic
  const user = await getUser()
  if (!user) {
    redirect("/auth/sign-in")
  }

  const convex = getConvexClient()
  let convexUser = await convex.query(api.users.getByWorkosId, {
    workosUserId: user.id,
  })

  if (!convexUser) {
    convexUser = await convex.mutation(api.users.createOrUpdateFromWorkOS, {
      workosUserId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    })
  }

  if (!convexUser || (convexUser.role !== "approved" && convexUser.role !== "admin")) {
    redirect("/waitlisted")
  }

  return (
    <DashboardProviders workosUserId={user.id} email={user.email} name={user.name} avatarUrl={user.avatarUrl}>
      {children}
    </DashboardProviders>
  )
}
