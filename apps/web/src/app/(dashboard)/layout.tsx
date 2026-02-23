import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { DashboardProviders } from "@/components/providers/dashboard-providers"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return (
    <DashboardProviders workosUserId={user.id} email={user.email} name={user.name}>
      {children}
    </DashboardProviders>
  )
}
